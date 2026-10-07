--
-- Space root-document references. `root_doc_url` keeps its existing meaning — the space directory — because every
-- reader depends on it; the immutable space root, which carries the credentials document, is a new separate column.
--
-- The space id is always derived from the space genesis key, whether credentials live in the control feed or in the
-- credentials document, so nothing here records how it was minted.
--
-- Immutable: recorded in `space_state_migrations` and never re-run.
--
ALTER TABLE echo_spaces ADD COLUMN space_root_doc_url TEXT;
ALTER TABLE echo_spaces ADD COLUMN credentials_doc_url TEXT;
