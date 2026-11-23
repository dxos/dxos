-- Copyright 2026 DXOS.org

-- One row per (trajectory, reducer): the reducer's state after the item at `cursor`, a cache rebuilt by refolding.
CREATE TABLE IF NOT EXISTS trajectory_checkpoint (
  -- Id of the trajectory the state was folded from.
  trajectory TEXT NOT NULL,
  reducer TEXT NOT NULL,
  -- Local cursor (`Feed.getLocalCursor`) of the last item folded.
  cursor TEXT NOT NULL,
  -- Id of that item, to detect a rebuilt index that renumbered the cursors.
  head TEXT NOT NULL,
  count INTEGER NOT NULL,
  state TEXT NOT NULL,
  PRIMARY KEY (trajectory, reducer)
);
