//
// Copyright 2025 DXOS.org
//

import { type AutomergeUrl } from '@automerge/automerge-repo';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Scope from 'effect/Scope';

import { Context } from '@dxos/context';
import { type Obj } from '@dxos/echo';
import { type SerializedFeed, type SerializedSpace } from '@dxos/echo-client';
import { type EchoHost } from '@dxos/echo-host';
import { type DatabaseDirectory, type EntityStructure } from '@dxos/echo-protocol';
import { EffectEx } from '@dxos/effect';
import { assertState, invariant } from '@dxos/invariant';
import { DXN, type EntityId, type IdentityDid, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { FeedProtocol, makeInProcessClient } from '@dxos/protocols';
import { SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';
import { FeedService } from '@dxos/protocols/rpc';
import { createFilename } from '@dxos/util';

import { type DataSpace } from '../spaces/data-space';

const SERIALIZED_SPACE_VERSION = 1;

const FEED_TYPENAME = 'org.dxos.type.feed';

const ATTR_ID = 'id';
const ATTR_TYPE = '@type';
const ATTR_META = '@meta';
const ATTR_DELETED = '@deleted';
const ATTR_PARENT = '@parent';
const ATTR_RELATION_SOURCE = '@relationSource';
const ATTR_RELATION_TARGET = '@relationTarget';

/**
 * Canonical order of well-known system fields in a serialized object.
 * All remaining `@*` fields follow in the order they appear on the source
 * object, and finally the data fields are appended in their existing order.
 */
const SYSTEM_FIELD_ORDER: readonly string[] = [
  ATTR_ID,
  ATTR_TYPE,
  ATTR_META,
  ATTR_DELETED,
  ATTR_PARENT,
  ATTR_RELATION_SOURCE,
  ATTR_RELATION_TARGET,
];

/**
 * Reorder the keys of an {@link Obj.JSON} so that system fields appear first
 * (`id`, `@type`, `@meta`, then any other `@*` attributes), followed by data
 * fields. The returned object has identical values to the input — only the key
 * iteration order changes.
 */
export const orderObjJsonFields = (obj: Obj.JSON): Obj.JSON => {
  const source = obj as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of SYSTEM_FIELD_ORDER) {
    if (key in source) {
      result[key] = source[key];
    }
  }
  for (const key of Object.keys(source)) {
    if (key.startsWith('@') && !(key in result)) {
      result[key] = source[key];
    }
  }
  for (const key of Object.keys(source)) {
    if (!(key in result)) {
      result[key] = source[key];
    }
  }
  return result as Obj.JSON;
};

export type WriteSerializedSpaceArchiveOptions = {
  space: DataSpace;
  echoHost: EchoHost;
  exportedBy?: IdentityDid;
};

/**
 * Write a JSON space archive from a live {@link DataSpace}.
 *
 * This runs entirely inside the worker and walks automerge documents directly —
 * it does not require a client-side {@link EchoDatabase}. The output conforms to
 * {@link SerializedSpace} and is compatible with the JSON format consumed by the
 * importer in {@link readSerializedSpaceArchive}.
 */
export const writeSerializedSpaceArchive = async (
  options: WriteSerializedSpaceArchiveOptions,
): Promise<SpaceArchive> => {
  const { space, echoHost, exportedBy } = options;

  const rootUrl = space.automergeSpaceState.lastEpoch?.subject.assertion.automergeRoot;
  assertState(rootUrl, 'Space does not have a root URL');
  const databaseRoot = space.databaseRoot;
  assertState(databaseRoot, 'Space database root is not ready');

  const rootDoc = databaseRoot.doc();
  invariant(rootDoc, 'Space database root document is not loaded');

  // Collect all object structures across the root doc and any linked docs.
  const objects: Obj.JSON[] = [];
  collectObjectsFromDoc(rootDoc, objects);

  for (const linkedUrl of databaseRoot.getAllLinkedDocuments()) {
    const handle = await echoHost.loadDoc<DatabaseDirectory>(Context.default(), linkedUrl as AutomergeUrl);
    if (!handle) {
      log.warn('linked document handle not available; skipping', { url: linkedUrl });
      continue;
    }
    const doc = handle.doc();
    collectObjectsFromDoc(doc, objects);
  }

  // Export queue/feed messages for every Feed object in the space.
  const feeds = await exportFeedData(space, echoHost, objects);

  const serialized: SerializedSpace = {
    version: SERIALIZED_SPACE_VERSION,
    timestamp: new Date().toISOString(),
    originalSpaceId: space.id,
    exportedBy,
    createdAt: Date.now(),
    objects,
    ...(feeds.length > 0 ? { feeds } : {}),
  };

  const encoded = new TextEncoder().encode(JSON.stringify(serialized));
  return {
    filename: createFilename({ parts: [space.id], ext: 'dx.json' }),
    contents: encoded,
    format: SpaceArchive.Format.JSON,
  };
};

const collectObjectsFromDoc = (doc: DatabaseDirectory, out: Obj.JSON[]): void => {
  const docObjects = doc.objects ?? {};
  for (const [objectId, structure] of Object.entries(docObjects)) {
    out.push(objectStructureToObjJson(objectId, structure));
  }
};

/**
 * Convert an internal {@link EntityStructure} into an {@link Obj.JSON}.
 *
 * Unlike the equivalent helper used for indexing, this preserves the object's
 * `@meta` section so archives produced by this writer can be round-tripped
 * through {@link Obj.fromJSON}.
 */
export const objectStructureToObjJson = (objectId: string, structure: EntityStructure): Obj.JSON => {
  const result: Record<string, unknown> = {
    [ATTR_ID]: objectId,
    [ATTR_TYPE]: (structure.system?.type?.['/'] ?? '') as any,
  };

  if (structure.meta) {
    result[ATTR_META] = {
      keys: structure.meta.keys ?? [],
      ...(structure.meta.tags ? { tags: structure.meta.tags } : {}),
      // Preserve the registry-provenance fields (typename / semver) so persisted
      // `Type.Type` entities round-trip with their `meta.key` / `meta.version`
      // intact — `Type.getTypename` / `Type.getVersion` read these. Without them
      // a type loaded from an archive would fall back to its object id.
      ...(structure.meta.key !== undefined ? { key: structure.meta.key } : {}),
      ...(structure.meta.version !== undefined ? { version: structure.meta.version } : {}),
      // Preserve annotations (e.g. `AppAnnotation.RootCollectionAnnotation` on a space's
      // properties object) so archives round-trip app-level metadata, not just schema data.
      ...(structure.meta.annotations && Object.keys(structure.meta.annotations).length > 0
        ? { annotations: structure.meta.annotations }
        : {}),
    };
  }
  if (structure.system?.deleted) {
    result[ATTR_DELETED] = true;
  }
  if (structure.system?.parent) {
    result[ATTR_PARENT] = structure.system.parent['/'];
  }
  if (structure.system?.source) {
    result[ATTR_RELATION_SOURCE] = structure.system.source['/'];
  }
  if (structure.system?.target) {
    result[ATTR_RELATION_TARGET] = structure.system.target['/'];
  }
  Object.assign(result, structure.data);

  return result as Obj.JSON;
};

const exportFeedData = async (space: DataSpace, echoHost: EchoHost, objects: Obj.JSON[]): Promise<SerializedFeed[]> => {
  const feeds: SerializedFeed[] = [];
  const spaceId: SpaceId = space.id;

  for (const obj of objects) {
    if (obj[ATTR_TYPE] == null) {
      continue;
    }

    const typeDxn = obj[ATTR_TYPE];
    const typeDxnNsid = DXN.isDXN(typeDxn) ? DXN.getName(typeDxn) : undefined;
    if (typeDxnNsid !== FEED_TYPENAME) {
      continue;
    }

    const namespace = (obj as any).namespace === 'trace' ? 'trace' : 'data';

    try {
      const messages = await collectFeedMessages(echoHost, spaceId, obj.id, namespace);
      if (messages.length > 0) {
        feeds.push({
          feedObjectId: obj.id,
          namespace,
          messages,
        });
      }
    } catch (err) {
      log.warn('failed to export feed data', { feedObjectId: obj.id, error: err });
    }
  }

  return feeds;
};

const collectFeedMessages = async (
  echoHost: EchoHost,
  spaceId: SpaceId,
  feedId: EntityId,
  namespace: string,
): Promise<Obj.JSON[]> => {
  const feedNamespace =
    namespace === 'trace' ? FeedProtocol.WellKnownNamespaces.trace : FeedProtocol.WellKnownNamespaces.data;

  const messages: Obj.JSON[] = [];
  let cursor: string | undefined;

  // Bridge the host feed Handlers to a client to call it in-process (Handlers are served, not
  // called directly). The scope owns the client for the duration of the read.
  const scope = Effect.runSync(Scope.make());
  const feedClient = await EffectEx.runPromise(
    makeInProcessClient(FeedService.Rpcs, echoHost.feedService).pipe(Effect.provideService(Scope.Scope, scope)),
  );
  try {
    while (true) {
      const result = await EffectEx.runPromise(
        feedClient.FeedService.queryFeed({
          query: {
            spaceId,
            feedIds: [feedId],
            feedNamespace,
            after: cursor,
          },
        }),
      );
      const batch = (result.objects ?? []).flatMap((encoded): Obj.JSON[] => {
        try {
          return [JSON.parse(encoded) as Obj.JSON];
        } catch (err) {
          log.verbose('feed object JSON parse failed; object ignored', { encoded, error: err });
          return [];
        }
      });
      if (batch.length === 0) {
        break;
      }
      for (const message of batch) {
        messages.push(orderObjJsonFields(message));
      }
      if (!result.nextCursor || result.nextCursor === cursor) {
        break;
      }
      cursor = result.nextCursor;
    }
  } finally {
    await EffectEx.runPromise(Scope.close(scope, Exit.void));
  }
  return messages;
};
