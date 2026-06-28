//
// Copyright 2023 DXOS.org
//

import type { Heads } from '@automerge/automerge';
import type { AutomergeUrl, DocumentId } from '@automerge/automerge-repo';
import type * as Brand from 'effect/Brand';

import { type EncodedReference } from '@dxos/echo-protocol';
import type { EntityMeta } from '@dxos/echo-protocol';
import type { URI, SpaceId } from '@dxos/keys';

import * as Doc from '../automerge/Doc';

//
// TargetKey — proxy-target cache key (shared with echo-handler to avoid
// circular dep: object-core ← echo-proxy-target ← core-db).
//

type TargetKeyType = {
  path: Doc.KeyPath;
  namespace: string;
  type: 'record' | 'array';
} & Brand.Brand<'TargetKey'>;

export type TargetKey = TargetKeyType;

export const TargetKey = {
  new: (path: Doc.KeyPath, namespace: string, type: 'record' | 'array'): TargetKey => {
    const copiedPath: Doc.KeyPath = [...path];
    return { path: copiedPath, namespace, type } as TargetKey;
  },
  hash: (key: TargetKey): string => JSON.stringify(key),
};

/**
 * Values that can be encoded/decoded from Automerge documents.
 * Uses readonly modifiers so that both mutable and readonly types can be accepted.
 */
export type DecodedAutomergePrimaryValue =
  | undefined
  | string
  | number
  | boolean
  | Uint8Array
  | readonly DecodedAutomergePrimaryValue[]
  | { readonly [key: string]: DecodedAutomergePrimaryValue }
  | EncodedReference;

//
// Shared entity-manager / database types — placed here so they can be
// referenced from both core-db (object-core) and proxy-db (database) without
// introducing circular imports.
//

/** Notification payload emitted when objects in a space are created or updated. */
export interface ItemsUpdatedEvent {
  spaceId: SpaceId;
  itemsUpdated: Array<{ id: string }>;
}

/** Changes derived from an automerge document-change event. */
export interface DocumentChanges {
  createdObjectIds: string[];
  updatedObjectIds: string[];
  objectsToRebind: string[];
  linkedDocuments: {
    [echoUri: string]: AutomergeUrl;
  };
}

export type GetObjectCoreByIdOptions = {
  /**
   * Request the object to be loaded if it is not already loaded.
   * @default true
   */
  load?: boolean;
};

export type LoadObjectOptions = {
  timeout?: number;
  /**
   * Will not eagerly preload strong deps.
   */
  returnWithUnsatisfiedDeps?: boolean;

  /**
   * Allow deleted objects to be returned.
   * @default false
   */
  allowDeleted?: boolean;

  /**
   * Resolve as soon as the worker-side disk probe settles instead of
   * waiting for the network. If the document for the requested object —
   * or any of its strong dependencies — is not on local storage, the call
   * returns `undefined` (or, with `returnWithUnsatisfiedDeps: true`, the
   * partial core) instead of stalling. Recursive strong-dep loads inherit
   * this preference. Used by query-driven loads where waiting on network
   * latency would stall the query pipeline.
   *
   * @default false
   */
  diskOnly?: boolean;
};

export type AddCoreOptions = {
  /**
   * Where to place the object in the Automerge document tree.
   * Root document is always loaded with the space.
   * Linked documents are loaded lazily.
   * Placing large number of objects in the root document may slow down the initial load.
   *
   * @default 'linked-doc'
   */
  placeIn?: 'linked-doc' | 'root-doc';
};

export type SpaceDocumentHeads = {
  /**
   * DocumentId => Heads.
   */
  heads: Record<DocumentId, Heads>;
};

export type AtomicReplaceObjectProps = {
  /**
   * Update data.
   * NOTE: This is not merged with the existing data.
   */
  data: any;

  /**
   * Update object type — either a typename DXN or a stored-schema EID
   * (see `getSchemaURI`).
   */
  type?: URI.URI;

  /**
   * Optional partial meta patch — merged into the existing object meta.
   * Fields explicitly set to `undefined` overwrite the previous value with `undefined`.
   */
  meta?: Partial<EntityMeta>;
};

/** Options for loading object documents. */
export interface LoadObjectDocumentOptions {
  /**
   * If `true`, do not block on the network for the linked document; wait
   * only for the worker-side disk probe to settle.
   */
  diskOnly?: boolean;
}

export type InitRootProxyFn = (core: unknown) => void;
