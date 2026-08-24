--
-- Space root-document references. `root_doc_url` keeps its existing meaning — the space directory — because every
-- reader depends on it; the immutable space root is a new, separate column.
--
-- `id_derivation` records which scheme minted the space id: 'rootDoc' means it is recomputable from `space_root_doc_url`
-- and a mismatch must be rejected, 'spaceKey' means the space predates the root document and only its key can check it.
-- NULL means the space has no root document yet.
--
-- Immutable: recorded in `space_state_migrations` and never re-run.
--
ALTER TABLE echo_spaces ADD COLUMN space_root_doc_url TEXT;
ALTER TABLE echo_spaces ADD COLUMN credentials_doc_url TEXT;
ALTER TABLE echo_spaces ADD COLUMN id_derivation TEXT;
