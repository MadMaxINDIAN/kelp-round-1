# kelp-round-1

Postgress Password - pi8iSXA3n.UGBh*
Postgress Connection String - postgresql://postgres:pi8iSXA3n.UGBh*@db.yahbohqkpwouxflyldxl.supabase.co:5432/postgres

## Create `users` Table

```sql
CREATE TABLE public.users (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    age INT NOT NULL,
    address JSONB,
    additional_info JSONB
);
```