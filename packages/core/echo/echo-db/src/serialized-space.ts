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
 * JSON space archive.
 *
 * ## Encoding and file format
 *
 * Single-file encoding. Default file extension is `.dx.json` (may be gzipped as `.dx.json.gz`).
 * The archive payload is the UTF-8 encoding of `JSON.stringify(serializedSpace)`.
 *
 * Produced by `SpacesService.ExportSpace` when `format = JSON`
 * and consumed by `SpacesService.ImportSpace` when a JSON archive is detected.
 *
 * See also the binary tar archive format described in
 * `@dxos/protocols` (`space-archive.ts`).
 */
export type SerializedSpace = {
  /**
   * Format version number.
   *
   * Current version: 1.
   */
  version: number;

  /**
   * Human-readable ISO timestamp when the archive was produced.
   */
  timestamp?: string;

  /**
   * Original space ID the archive was exported from (SpaceId).
   */
  originalSpaceId?: string;

  /**
   * DID of the identity that exported the space.
   */
  exportedBy?: string;

  /**
   * Milliseconds since Unix epoch when the archive was produced.
   */
  createdAt?: number;

  /**
   * List of ECHO objects included in the archive.
   */
  objects: Obj.JSON[];

  /**
   * Feed/queue message data.
   * Optional for backward compatibility with archives that predate feed support.
   */
  feeds?: SerializedFeed[];
};
