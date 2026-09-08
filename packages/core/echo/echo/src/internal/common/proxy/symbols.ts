//
// Copyright 2024 DXOS.org
//

// TODO(dmaretskyi): Rename all symbols that are props to end with *Key.
export const EventId = Symbol.for('@dxos/live-object/EventId');

export const ChangeId = Symbol.for('@dxos/live-object/ChangeId');

/**
 * The key this object's change context is opened under, or `undefined` while the object is not yet
 * initialized and is therefore freely mutable. Answered by each variant's behaviour prototype — the
 * in-memory objects key by their root target, database-backed ones by their `ObjectCore` — so the
 * shared proxy handler can enforce the read-only gate for every variant without dispatching.
 */
export const ChangeKeyId = Symbol.for('@dxos/live-object/ChangeKey');
