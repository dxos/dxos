//
// Copyright 2024 DXOS.org
//

/**
 * Saved in a CBOR encoded file, with `.dxprofile` extension.
 */
export type ProfileArchive = {
  meta: {
    timestamp: string;
    /** Host (e.g. `main.composer.space`, `localhost:5173`) where the archive was exported. */
    origin?: string;
  };
  storage: ProfileArchiveEntry[];
};

export type ProfileArchiveEntry = {
  type: ProfileArchiveEntryType;
  /**
   * FILE: filename in random-access storage.
   * KEY_VALUE: binary LevelDB key.
   * SQLITE_DATABASE: OPFS database filename (e.g. `DXOS`).
   */
  key: string | Uint8Array;
  /**
   * FILE / KEY_VALUE / SQLITE_DATABASE: binary payload.
   * SQLITE_DATABASE must be a valid SQLite file (magic `SQLite format 3`).
   */
  value: string | Uint8Array;
};

export enum ProfileArchiveEntryType {
  FILE = 1,
  KEY_VALUE = 2,
  /** OPFS-hosted SQLite database; `key` is the OPFS filename, `value` is raw SQLite bytes. */
  SQLITE_DATABASE = 3,
}
