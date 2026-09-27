//
// Copyright 2026 DXOS.org
//

import { type DocumentId } from '@automerge/automerge-repo';
import type * as Effect from 'effect/Effect';
import type * as SqlClient from 'effect/unstable/sql/SqlClient';

import { Event } from '@dxos/async';
import { type DatabaseDirectory, isEncodedReference } from '@dxos/echo-protocol';
import { RuntimeProvider } from '@dxos/effect';
import { type IndexEngine } from '@dxos/index-core';
import { invariant } from '@dxos/invariant';
import { EID, EntityId, type SpaceId, type URI } from '@dxos/keys';
import { type DataService } from '@dxos/protocols/rpc';

import { type InvalidationHint } from './invalidation-hint.ts';

export type DocumentSidecarProps = {
  indexEngine: () => IndexEngine;
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient>;
  /** Re-runs the queries a device-annotation write can change the result of. */
  invalidateQueries: (hint: InvalidationHint) => void;
};

export type DeviceAnnotationsChangedEvent = {
  documentIds: ReadonlySet<DocumentId>;
};

/**
 * Device-local state the host delivers to a client alongside a document's bytes: the values of the
 * document's device-scoped annotations, and the index's view of whether each reference target exists.
 * Neither is part of the replicated document, so each is read from the device's own database.
 */
export class DocumentSidecar {
  /** Fires after a write, with the documents whose device annotations changed. */
  readonly deviceAnnotationsChanged = new Event<DeviceAnnotationsChangedEvent>();

  /** Fires after an index pass, with the objects whose availability may have changed. */
  readonly availabilityChanged = new Event<ReadonlySet<EntityId>>();

  constructor(private readonly _params: DocumentSidecarProps) {}

  /**
   * Every device-scoped annotation value held for each document.
   */
  async readDeviceAnnotations(
    spaceId: SpaceId,
    documentIds: readonly DocumentId[],
  ): Promise<Map<string, DataService.DeviceAnnotation[]>> {
    const result = new Map<string, DataService.DeviceAnnotation[]>(documentIds.map((id) => [id, []]));
    if (documentIds.length === 0) {
      return result;
    }
    const rows = await this.#run(this._params.indexEngine().deviceAnnotations.queryByDocuments(spaceId, documentIds));
    for (const { documentId, objectId, key, value } of rows) {
      result.get(documentId)?.push({ objectId, key, value });
    }
    return result;
  }

  /**
   * Applies a client's writes to a document's device-scoped annotations.
   */
  async writeDeviceAnnotations(
    spaceId: SpaceId,
    documentId: DocumentId,
    entries: readonly DataService.DeviceAnnotation[],
  ): Promise<void> {
    if (entries.length === 0) {
      return;
    }
    // Queries read the values with `json_each`, which fails on malformed JSON for every row it scans.
    for (const { objectId, key, value } of entries) {
      invariant(value === undefined || isJson(value), `Device annotation ${key} on ${objectId} is not valid JSON.`);
    }
    await this.#run(
      this._params
        .indexEngine()
        .deviceAnnotations.write(
          entries.map(({ objectId, key, value }) => ({ spaceId, documentId, objectId, key, value })),
        ),
    );
    this.deviceAnnotationsChanged.emit({ documentIds: new Set([documentId]) });
    this._params.invalidateQueries({
      spaceIds: new Set([spaceId]),
      objectIds: new Set(entries.map(({ objectId }) => objectId).filter(EntityId.isValid)),
    });
  }

  /**
   * Availability of each `echo:` reference target, read from the index. A space-less URI resolves
   * against `spaceId`, the space of the document holding it; other URI kinds get no hint.
   */
  async readRefHints(spaceId: SpaceId, uris: Iterable<URI.URI>): Promise<DataService.RefHint[]> {
    const bySpace = new Map<SpaceId, Map<EntityId, URI.URI[]>>();
    for (const uri of uris) {
      const eid = EID.tryParse(uri);
      const entityId = eid && EID.getEntityId(eid);
      if (!eid || !entityId) {
        continue;
      }
      const targetSpaceId = EID.getSpaceId(eid) ?? spaceId;
      const byId = bySpace.get(targetSpaceId) ?? new Map<EntityId, URI.URI[]>();
      bySpace.set(targetSpaceId, byId);
      byId.set(entityId, [...(byId.get(entityId) ?? []), uri]);
    }

    const hints: DataService.RefHint[] = [];
    for (const [targetSpaceId, byId] of bySpace) {
      const availability = await this.#run(
        this._params.indexEngine().queryAvailability(targetSpaceId, [...byId.keys()]),
      );
      for (const [entityId, targetUris] of byId) {
        const hint = availability.get(entityId) ?? 'dangling';
        hints.push(...targetUris.map((uri) => ({ uri, hint })));
      }
    }
    return hints;
  }

  /**
   * Called after an index pass with the objects it touched; a pass that touched none (feed blocks only) is ignored.
   */
  notifyIndexed(objectIds: ReadonlySet<EntityId> | undefined): void {
    if (objectIds && objectIds.size > 0) {
      this.availabilityChanged.emit(objectIds);
    }
  }

  #run<A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient>): Promise<A> {
    return RuntimeProvider.runPromise(this._params.runtime)(effect);
  }
}

/**
 * Every reference URI held anywhere in a JSON value.
 */
export const collectReferences = (value: unknown, uris = new Set<URI.URI>()): Set<URI.URI> => {
  if (isEncodedReference(value)) {
    uris.add(value['/']);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectReferences(item, uris));
  } else if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach((item) => collectReferences(item, uris));
  }
  return uris;
};

/**
 * Every reference URI held by the objects of a document: their data, meta, and system fields (parent,
 * relation endpoints).
 */
export const collectDocumentReferences = (doc: DatabaseDirectory): Set<URI.URI> => {
  const uris = new Set<URI.URI>();
  for (const object of Object.values(doc.objects ?? {})) {
    collectReferences(object, uris);
  }
  return uris;
};

const isJson = (value: string): boolean => {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
};
