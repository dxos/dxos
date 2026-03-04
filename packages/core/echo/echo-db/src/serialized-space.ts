//
// Copyright 2024 DXOS.org
//

import { type EncodedReference } from '@dxos/echo-protocol';
import { deepMapValuesAsync } from '@dxos/util';
import { Obj } from '@dxos/echo';

/**
 * Archive of echo objects.
 *
 * ## Encoding and file format
 *
 * The data is serialized to JSON.
 * Preferred file extensions are `.dx.json`.
 * The file might be compressed with gzip (`.dx.json.gz`).
 */
export type SerializedSpace = {
  /**
   * Format version number.
   *
   * Current version: 1.
   */
  version: number;

  /**
   * Human-readable date of creation.
   */
  timestamp?: string;

  /**
   * List of objects included in the archive.
   */
  objects: Obj.JSON[];
};
