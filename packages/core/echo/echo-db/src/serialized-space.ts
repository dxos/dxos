//
// Copyright 2024 DXOS.org
//

import { type EncodedReference } from '@dxos/echo-protocol';
import { deepMapValuesAsync } from '@dxos/util';

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
   * Space key.
   */
  // TODO(mykola): Maybe remove this?
  spaceKey?: string;

  /**
   * List of objects included in the archive.
   */
  objects: SerializedObject[];
};

export type SerializedObject = {
  /**
   * Format version number.
   *
   * Current version: 1.
   */
  '@version': number;

  /**
   * Human-readable date of creation.
   */
  '@timestamp'?: string;

  /**
   * Unique object identifier.
   */
  '@id': string;

  /**
   * Reference to a type.
   */
  '@type'?: EncodedReference | string;

  /**
   * Flag to indicate soft-deleted objects.
   */
  '@deleted'?: boolean;

  /**
   * @deprecated
   *
   * Model name for the objects backed by a legacy ECHO model.
   */
  '@model'?: string;
} & Record<string, any>;

/**
 * Updates the serialized object data to the latest version.
 */
export const normalizeSerializedObjectData = async (data: SerializedObject): Promise<SerializedObject> => {
  data = await deepMapValuesAsync(data, async (value, recurse) => recurse(value));

  if (data['@timestamp']) {
    data['@timestamp'] = new Date(data['@timestamp']).toISOString();
  }

  return data;
};
