//
// Copyright 2024 DXOS.org
//

/**
 * Saved in a CBOR encoded file, with `.dxprofile` extension.
 */
export type ProfileArchive = {
  meta: {
    timestamp: string;
  };
  storage: ProfileArchiveEntry[];
};

export type ProfileArchiveEntry = {
  type: ProfileArchiveEntryType;
  key: string | Uint8Array;
  value: string | Uint8Array;
};

export enum ProfileArchiveEntryType {
  FILE = 1,
  KEY_VALUE = 2,
}
