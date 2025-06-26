require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const fileUpload = require('./middleware/fileUpload');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.POSTGRES_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
});

app.use(express.json());
app.use(cors());

app.post('/upload', fileUpload.single('file'), async (req, res) => {
    res.json({ status: 'success', message: 'File uploaded successfully. Wait for results in to be printed in console.', file: req.file });

    const filePath = path.join(__dirname, '/public', req.file.filename);

    // Wait for the file to be available
    while (!fs.existsSync(filePath)) {
        console.log('Waiting for file to be available...');
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    const startTime = Date.now();
    
    const stream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity
    });

    let rowCount = 0;
    let headerData = '';
    var db_query = [];

    var db_triggers = [];

    for await (const line of rl) {
        if (rowCount === 0) {
            rowCount++;
            var headerString = line;
            headerData = headerString.split(',').map(h => h.trim());
            continue;
        }

        if (line.trim() === '') {
            continue;
        }

        var lineData = line.split(',').map(value => value.trim());
        if (lineData.length !== headerData.length) {
            continue;
        }
        const jsonObject = CreateJsonObject(headerData, lineData);
        rowCount++;

        try {
            const fullName = jsonObject.name.firstName + ' ' + jsonObject.name.lastName;
            const age = parseInt(jsonObject.age, 10);
            const address = jsonObject.address ? JSON.stringify(jsonObject.address) : null;

            const { name, age: _, address: __, ...rest } = jsonObject;
            const additionalInfo = Object.keys(rest).length > 0 ? JSON.stringify(rest) : null;

            // Use BATCH_SIZE from environment variable (default to 1000 if not set)
            const BATCH_SIZE = parseInt(process.env.BATCH_SIZE, 10) || 1000;
            db_query.push([fullName, age, address, additionalInfo]);

            if (db_query.length >= BATCH_SIZE) {
                const values = db_query
                    .map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`)
                    .join(', ');
                const flatValues = db_query.flat();
                db_triggers.push(
                    pool.query(
                        `INSERT INTO users (name, age, address, additional_info) VALUES ${values}`,
                        flatValues
                    )
                );
                db_query = [];
            }
        } catch (err) {
            console.error('Error inserting record:', err);
        }
        // break;
    }

    const endTime = Date.now();
    console.log(`Processed ${rowCount} rows in ${((endTime - startTime) / 1000).toFixed(2)} seconds.`);

    try {
        await Promise.all(db_triggers);
        console.log(`Successfully inserted ${db_triggers.length} records into the database.`);

        const result = await pool.query(`
            SELECT
              age_group,
              ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
            FROM (
              SELECT
                CASE
                  WHEN age < 20 THEN '< 20'
                  WHEN age BETWEEN 20 AND 40 THEN '20 to 40'
                  WHEN age BETWEEN 41 AND 60 THEN '40 to 60'
                  ELSE '> 60'
                END AS age_group
              FROM public.users
            ) AS grouped
            GROUP BY age_group
            ORDER BY age_group;
        `);
        console.table(result.rows);
    } catch (err) {
        console.error('Error inserting records into the database:', err);
    }
});

function CreateJsonObject(HeaderData, LineData) {
    let finalJsonObject = {};
    HeaderData.forEach((header, index) => {
        var headerPath = header.split('.').map(h => h.trim());
        AddJsonValue(finalJsonObject, headerPath, LineData[index]);
    });
    return finalJsonObject;
}

function AddJsonValue(jsonObject, headerPath, value) {
    if (headerPath.length === 1) {
        jsonObject[headerPath[0]] = value;
    } else {
        var currentHeader = headerPath.shift();
        if (!jsonObject[currentHeader]) {
            jsonObject[currentHeader] = {};
        }
        AddJsonValue(jsonObject[currentHeader], headerPath, value);
    }
}

// Clear database endpoint
app.post('/clear', async (req, res) => {
    try {
        await pool.query('DELETE FROM users');
        res.json({ status: 'success', message: 'Database cleared successfully.' });
    } catch (err) {
        console.error('Error clearing database:', err);
        res.status(500).json({ error: 'Failed to clear database' });
    }
});

// Test database connection
app.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({ status: 'ok', time: result.rows[0].now });
    } catch (err) {
        console.error('DB connection error:', err);
        res.status(500).json({ error: 'Database not connected' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
