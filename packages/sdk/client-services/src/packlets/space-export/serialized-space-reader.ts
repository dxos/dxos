//
// Copyright 2025 DXOS.org
//

import { type Obj } from '@dxos/echo';
import { type SerializedSpace } from '@dxos/echo-db';
import { type DatabaseDirectory, type ObjectStructure } from '@dxos/echo-protocol';
import { assertArgument } from '@dxos/invariant';
import { type SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';

const ATTR_TYPE = '@type';
const ATTR_META = '@meta';
const ATTR_DELETED = '@deleted';
const ATTR_PARENT = '@parent';
const ATTR_RELATION_SOURCE = '@relationSource';
const ATTR_RELATION_TARGET = '@relationTarget';

const INTERNAL_KEYS: ReadonlySet<string> = new Set([
  'id',
  ATTR_TYPE,
  ATTR_META,
  ATTR_DELETED,
  ATTR_PARENT,
  ATTR_RELATION_SOURCE,
  ATTR_RELATION_TARGET,
]);

/**
 * Parse a JSON space archive.
 *
 * The archive contents are expected to be the UTF-8 encoding of
 * `JSON.stringify(serializedSpace)`.
 */
export const readSerializedSpaceArchive = (archive: SpaceArchive): SerializedSpace => {
  const text = new TextDecoder().decode(archive.contents);
  const parsed = JSON.parse(text) as SerializedSpace;
  assertArgument(typeof parsed === 'object' && parsed !== null, 'archive', 'Invalid JSON archive payload');
  assertArgument(typeof parsed.version === 'number', 'archive', 'Missing SerializedSpace.version');
  assertArgument(Array.isArray(parsed.objects), 'archive', 'Missing SerializedSpace.objects');
  return parsed;
};

/**
 * Convert an {@link Obj.JSON} back into an internal {@link ObjectStructure} suitable
 * for embedding into a {@link DatabaseDirectory}.
 */
export const objJsonToObjectStructure = (obj: Obj.JSON): ObjectStructure => {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (INTERNAL_KEYS.has(key)) {
      continue;
    }
    data[key] = value;
  }

  const system: NonNullable<ObjectStructure['system']> = {};

  const type = obj[ATTR_TYPE];
  if (type) {
    system.type = { '/': type as string };
  }

  const parent = (obj as any)[ATTR_PARENT];
  if (typeof parent === 'string') {
    system.parent = { '/': parent };
  }

  const relationSource = (obj as any)[ATTR_RELATION_SOURCE];
  const relationTarget = (obj as any)[ATTR_RELATION_TARGET];
  if (typeof relationSource === 'string' || typeof relationTarget === 'string') {
    system.kind = 'relation';
    if (typeof relationSource === 'string') {
      system.source = { '/': relationSource };
    }
    if (typeof relationTarget === 'string') {
      system.target = { '/': relationTarget };
    }
  } else {
    system.kind = 'object';
  }

  if ((obj as any)[ATTR_DELETED]) {
    system.deleted = true;
  }

  const meta = (obj as any)[ATTR_META];
  return {
    system,
    meta: {
      keys: meta?.keys ?? [],
      ...(meta?.tags ? { tags: meta.tags } : {}),
    },
    data,
  };
};

/**
 * Build a new {@link DatabaseDirectory} containing every object from the archive,
 * keyed by object id. The caller is responsible for stamping the `access.spaceKey`
 * and version fields after the document is created.
 */
export const buildDatabaseDirectoryFromObjects = (objects: readonly Obj.JSON[]): DatabaseDirectory => {
  const map: Record<string, ObjectStructure> = {};
  for (const obj of objects) {
    map[obj.id] = objJsonToObjectStructure(obj);
  }
  return {
    objects: map,
    links: {},
  };
};
