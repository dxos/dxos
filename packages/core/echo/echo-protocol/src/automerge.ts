//
// Copyright 2024 DXOS.org
//

// Copied here to not depend on the automerge package.
// Raw strings don't support CRDT merging but are more efficient to load and store.
// We need to call .toString() to get the actual string value.
export interface RawString {
  toString(): string;
}
