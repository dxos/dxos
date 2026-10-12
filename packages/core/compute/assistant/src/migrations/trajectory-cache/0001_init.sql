-- Copyright 2026 DXOS.org

-- One row per (feed, reducer): the reducer's state after the item at `cursor`, a cache rebuilt by refolding the feed.
CREATE TABLE IF NOT EXISTS trajectory_checkpoint (
  feed TEXT NOT NULL,
  reducer TEXT NOT NULL,
  -- Local cursor (`Feed.getLocalCursor`) of the last item folded.
  cursor TEXT NOT NULL,
  -- Id of that item, to detect a rebuilt index that renumbered the cursors.
  head TEXT NOT NULL,
  count INTEGER NOT NULL,
  state TEXT NOT NULL,
  PRIMARY KEY (feed, reducer)
);
