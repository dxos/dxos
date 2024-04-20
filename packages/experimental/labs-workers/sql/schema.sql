--
-- Copyright 2024 DXOS.org
--

-- https://developers.cloudflare.com/d1/build-with-d1/d1-client-api

-- TODO(burdon): DANGER! ALTER TABLE?
DROP TABLE IF EXISTS Users;

CREATE TABLE IF NOT EXISTS Users (
  user_id INTEGER PRIMARY KEY,
  identity_key TEXT,
  access_token TEXT,
  created NUMBER,
  name TEXT,
  email TEXT UNIQUE,
  status CHAR
);
