-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cats table (keeping 'descreption' typo for compatibility)
CREATE TABLE IF NOT EXISTS cats (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tag VARCHAR(255),
    descreption TEXT,
    img TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cats_name ON cats(name);
CREATE INDEX IF NOT EXISTS idx_cats_tag ON cats(tag);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
