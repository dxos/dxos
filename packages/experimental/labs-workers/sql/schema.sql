--
-- Copyright 2024 DXOS.org
--

-- https://developers.cloudflare.com/d1/build-with-d1/d1-client-api

DROP TABLE IF EXISTS Users;

CREATE TABLE IF NOT EXISTS Users (
  UserId INTEGER PRIMARY KEY,
  Created NUMBER,
  Email TEXT KEY,
  Status CHAR
);
