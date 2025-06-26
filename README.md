# kelp-round-1

## Create `users` Table
If using own sql database than, run below query
```sql
CREATE TABLE public.users (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    age INT NOT NULL,
    address JSONB,
    additional_info JSONB
);
```

## Sample Run on Local Machine

![Evidence](evidence.png)

## Example `.env` File
Add this File in root folder to configure it correctly
```env
POSTGRES_PASSWORD=pi8iSXA3n.UGBh*
POSTGRES_CONNECTION_STRING=postgresql://postgres:pi8iSXA3n.UGBh*@db.yahbohqkpwouxflyldxl.supabase.co:5432/postgres
BATCH_SIZE=1000
```

## Postman Collection
You can find the Postman collection for this project here: [kelp-interview.postman_collection.json](kelp-interview.postman_collection.json)

## Steps to Start the Server

1. Install dependencies:
    ```bash
    npm install
    ```
2. Copy the example `.env` file and update values as needed.
3. Start the server:
    ```bash
    npm start
    ```
4. The server will run on the port specified in your `.env` file.
