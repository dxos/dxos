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

/**
 * Marks an array whose elements are root entities held by identity (e.g. `meta.tags`), so the
 * ownership, copy and reactify walkers treat each element as an opaque reference, not nested data.
 */
export const EntityElementsId = Symbol.for('@dxos/live-object/EntityElements');

/**
 * Schema annotation on a declaration whose values are root entities held by identity; an array of
 * them is marked with {@link EntityElementsId} when a typed target is prepared or assigned.
 */
export const EntityValueAnnotationId = '@dxos/echo/annotation/EntityValue';
