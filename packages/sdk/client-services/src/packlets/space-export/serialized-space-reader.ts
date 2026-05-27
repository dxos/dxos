//
// Copyright 2025 DXOS.org
//

import { type Obj } from '@dxos/echo';
import { type SerializedSpace } from '@dxos/echo-db';
import { type DatabaseDirectory, type ObjectStructure } from '@dxos/echo-protocol';
import { assertArgument } from '@dxos/invariant';
import { URI } from '@dxos/keys';
import { type SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';

const ATTR_TYPE = '@type';
const ATTR_META = '@meta';
const ATTR_DELETED = '@deleted';
const ATTR_PARENT = '@parent';
const ATTR_RELATION_SOURCE = '@relationSource';
const ATTR_RELATION_TARGET = '@relationTarget';

/**
 * Type URI of the meta-schema (`TypeSchema` / `Type.Type`). Objects with this
 * `@type` represent persisted ECHO type definitions and must be branded
 * `system.kind = 'type'` so `Filter.type(Type.Type)` and `Type.isType` recognize
 * them after import. Anything else defaults to `'object'` (or `'relation'` when
 * source/target attrs are present).
 */
const TYPE_KIND_SCHEMA_URI = 'dxn:org.dxos.type.schema:0.1.0';

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
    system.type = { '/': URI.make(type) };
  }

  const parent = (obj as any)[ATTR_PARENT];
  if (typeof parent === 'string') {
    system.parent = { '/': URI.make(parent) };
  }

  const relationSource = (obj as any)[ATTR_RELATION_SOURCE];
  const relationTarget = (obj as any)[ATTR_RELATION_TARGET];
  if (typeof relationSource === 'string' || typeof relationTarget === 'string') {
    system.kind = 'relation';
    if (typeof relationSource === 'string') {
      system.source = { '/': URI.make(relationSource) };
    }
    if (typeof relationTarget === 'string') {
      system.target = { '/': URI.make(relationTarget) };
    }
  } else if (type === TYPE_KIND_SCHEMA_URI) {
    // Persisted ECHO type definitions — instances of the meta-schema — must
    // brand `kind = 'type'` so the database schema registry can find them.
    system.kind = 'type';
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
