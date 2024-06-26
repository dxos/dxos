//

/**
 * Saved in a CBOR encoded file, with `.dxprofile` extension.
 */
//
// Copyright 2024 DXOS.org
//

export type ProfileArchive = {
  storage: ProfileArchiveEntry[];
  meta: {
    timestamp: string;
  };
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
