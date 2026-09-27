--
-- Device-scoped annotation values: annotations declared with `storage: 'device'` never enter the
-- replicated automerge document, so each device keeps its own values here, keyed by the object they
-- annotate. `documentId` is the document the object lived in when the value was written; the client
-- receives a document's values alongside the document itself.
--
-- `value` is the JSON encoding of the annotation value.
--
-- Immutable: recorded in `device_annotation_migrations` and never re-run.
--
CREATE TABLE IF NOT EXISTS deviceAnnotations (
  spaceId TEXT NOT NULL,
  objectId TEXT NOT NULL,
  key TEXT NOT NULL,
  documentId TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (spaceId, objectId, key)
);

CREATE INDEX IF NOT EXISTS idx_deviceAnnotations_documentId ON deviceAnnotations (documentId);
