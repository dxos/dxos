-- Owner of every schema object created through SqlService; anything absent here is a system object.
CREATE TABLE IF NOT EXISTS dx_sql_service_objects (
  name TEXT PRIMARY KEY,
  database TEXT NOT NULL
);
