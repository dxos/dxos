//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Layer from 'effect/Layer';
import type * as SqlClient from 'effect/sql/SqlClient';

import type * as MemoryService from '@dxos/echo-memory/MemoryService';
import type * as RdfStore from '@dxos/echo-memory/RdfStore';
import { type QuadStore } from '@dxos/sparql-sqlite/async';
import * as Platform from '@dxos/sql-sqlite/Platform';

import * as LocalRdfStore from './LocalRdfStore.ts';
import * as RdfMemory from './RdfMemory.ts';

//
// A memory and its store in one process, over native SQLite: what a CLI, a script or a test opens.
//

/**
 * A memory over the async `SqlClient` in context, and the store it runs on (for bulk export and import); `prefix` lets
 * several memories share one database.
 */
export const layer = (
  options?: Pick<QuadStore.Options, 'prefix'>,
): Layer.Layer<MemoryService.MemoryService | RdfStore.RdfStore, never, SqlClient.SqlClient> =>
  RdfMemory.layer.pipe(Layer.provideMerge(LocalRdfStore.layer(options)));

/** A memory over a private in-memory SQLite database, closed with the layer's scope. */
export const layerMemory: Layer.Layer<MemoryService.MemoryService | RdfStore.RdfStore> = layer().pipe(
  Layer.provide(Platform.layerMemory),
  Layer.orDie,
);

/**
 * A memory over a SQLite file (created when absent), closed with the layer's scope; reopening the same path sees the
 * facts, subscriptions and outboxes written before.
 */
export const layerFile = (path: string): Layer.Layer<MemoryService.MemoryService | RdfStore.RdfStore> =>
  layer().pipe(Layer.provide(Platform.layerFile(path)), Layer.orDie);
