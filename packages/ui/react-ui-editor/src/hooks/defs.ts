//
// Copyright 2024 DXOS.org
//

// Runtime data structure.
export type Range = {
  from: number;
  to: number;
};

// Persistent data structure.
export type Comment = {
  id: string;
  cursor?: string;
};
