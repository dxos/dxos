//
// Copyright 2024 DXOS.org
//

// Runtime data structure.
export type Range = {
  from: number;
  to: number;
};

// Persistent data structure.
// TODO(burdon): Rename annotation?
export type Comment = {
  id: string;
  cursor?: string;
};
