//
// Copyright 2026 DXOS.org
//

/**
 * Storage-agnostic data migrations over stored Subduction records, shared by every peer that keeps
 * such records (`@dxos/echo-host/subduction-migrations`): the client wires them up in `client.ts`,
 * the edge over its Durable Object storage. Nothing here touches SQLite or the storage adapter.
 */

export * from './fragment-checkpoints.ts';
export * from './framework.ts';
export * from './self-checkpointed-fragments.ts';
