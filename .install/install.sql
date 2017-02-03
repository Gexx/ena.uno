-- Drop tables if exists
DROP TABLE IF EXISTS "users";
DROP TABLE IF EXISTS "history";

-- Create tables
CREATE TABLE "users" (
    "id" BIGSERIAL PRIMARY KEY,
    "nick" VARCHAR(30) NOT NULL,
    "token" VARCHAR(128) DEFAULT NULL,
    
    "username" TEXT DEFAULT NULL,
    "password" TEXT DEFAULT NULL,
    "email" TEXT DEFAULT NULL,
    "status" TEXT DEFAULT '',

    "ga" TEXT DEFAULT NULL,
    "muted" BIGINT DEFAULT 0 NOT NULL,
    "banned" BIGINT DEFAULT 0 NOT NULL,
    "public" BOOLEAN DEFAULT FALSE NOT NULL,
    "locked" BOOLEAN DEFAULT FALSE NOT NULL
);

CREATE TABLE "history" (
    "id" BIGSERIAL PRIMARY KEY,
    "type" INTEGER NOT NULL,
    "who_id" BIGINT NOT NULL,
    "nick" VARCHAR(30),
    "when" BIGINT NOT NULL,
    "what" TEXT
);

-- Set sequence starting ID data...
SELECT setval('public.users_id_seq', 10000, true);