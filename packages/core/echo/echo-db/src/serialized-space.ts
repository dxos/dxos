//
// Copyright 2024 DXOS.org
//

import { type Obj } from '@dxos/echo';

/**
 * Serialized feed/queue data associated with a Feed ECHO object.
 */
export type SerializedFeed = {
  /** ID of the Feed ECHO object this data belongs to. */
  feedObjectId: string;
  /** Feed namespace ('data' | 'trace'). */
  namespace: string;
  /** Queue messages as JSON. */
  messages: Obj.JSON[];
};

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

  /**
   * Feed/queue message data.
   * Optional for backward compatibility with archives that predate feed support.
   */
  feeds?: SerializedFeed[];
};
