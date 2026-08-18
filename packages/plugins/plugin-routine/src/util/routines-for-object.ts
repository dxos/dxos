//
// Copyright 2026 DXOS.org
//

import * as Instructions from '@dxos/compute/Instructions';
import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { AccessToken, Connection, Cursor } from '@dxos/link';

/**
 * Traverses an outgoing reference held at a nested property path (here `Cursor.spec.source`), which the
 * typed {@link Query.Query.reference} cannot name — its key type covers top-level properties only, while
 * the query executor already resolves dot-paths. Built from the AST rather than added to the core query
 * builder, so an unchecked path string stays local to this one call site; chain a `Filter.type` to restore
 * the result type.
 *
 * TODO(wittjosiah): Replace with a typed nested-path hop on the query builder — a recursive
 *   template-literal path type would resolve `'spec.source'` to `Ref<AccessToken> | Ref<Feed>`, making a
 *   wrong path a compile error and the type filter a narrowing rather than a repair.
 */
const referenceAtPath = (query: Query.Any, path: string): Query.Any =>
  Query.fromAst({ type: 'reference-traversal', anchor: query.ast, property: path });

/**
 * Reactive query for all routines connected to an object O, via four structural paths:
 *
 * 1. **Trigger path** (two hops): O is referenced by a Trigger (via `input` or `spec.feed`), and that
 *    Trigger is referenced by a Routine's `triggers` array.
 * 2. **Cursor path** (three hops): a per-binding sync Trigger doesn't reference its synced target
 *    directly — its `binding` references an external-sync {@link Cursor}, and the Cursor's `spec.target`
 *    references O. So O is reached one hop further out (O ← Cursor ← Trigger ← Routine), keeping the target
 *    ref out of the operation input.
 * 3. **Connection path** (four hops): an account-level sync Trigger names only the {@link Connection} — it
 *    fans out over every binding of that account, so no binding (and hence no target) appears in its input.
 *    O is reached by joining on the credential the binding authenticates with:
 *    O ← Cursor → `spec.source` (AccessToken) ← Connection ← Trigger ← Routine. This is what surfaces one
 *    account's sync routine on each of its synced objects (e.g. a Mailbox's routines companion).
 * 4. **Instructions path** (two hops): O is listed in an Instructions' `objects` context array, and those
 *    Instructions are the Routine's action (`spec.instructions`). Both hops traverse `Ref` fields, so they are
 *    fully queryable — no JavaScript parent-symbol traversal needed.
 *
 * ECHO's reverse-ref index is structural — it tracks every `Ref` regardless of schema path, including
 * nested untyped records and union fields — so all variants are covered.
 */
export const connectedRoutinesQuery = (object: Obj.Unknown): Query.Query<Routine.Routine> => {
  // Trigger path: O ← Trigger (any ref path, incl. nested `input`) ← Routine.triggers.
  const byInput = Query.select(Filter.id(object.id)).referencedBy(Trigger.Trigger);
  // Feed variant: O's feed ← Trigger.spec.feed ← Routine.triggers.
  // `.reference('feed')` is empty for objects without a feed prop, so this adds nothing for non-feed objects.
  const byFeed = Query.select(Filter.id(object.id)).reference('feed').referencedBy(Trigger.Trigger);
  // Cursor variant: O ← Cursor (spec.target) ← Trigger (input.binding) ← Routine.triggers.
  const byCursor = Query.select(Filter.id(object.id)).referencedBy(Cursor.Cursor).referencedBy(Trigger.Trigger);
  // Connection variant: O ← Cursor → spec.source (AccessToken) ← Connection ← Trigger (input.connection).
  // The forward hop is what makes this work without the trigger naming any binding.
  const byConnection = referenceAtPath(Query.select(Filter.id(object.id)).referencedBy(Cursor.Cursor), 'spec.source')
    // The traversal is untyped, so the type is restored by a real filter rather than an assertion — and
    // it is load-bearing: a feed cursor's `spec.source` is a `Ref<Feed>`, which this drops.
    .select(Filter.type(AccessToken.AccessToken))
    .referencedBy(Connection.Connection)
    .referencedBy(Trigger.Trigger);
  const byTrigger = Query.all(byInput, byFeed, byCursor, byConnection).referencedBy(Routine.Routine, 'triggers');

  // Instructions path: O ← Instructions.objects ← Routine (via `spec.instructions`). The second hop drops the
  // property key: the instructions ref is nested in the `spec` union, and the reverse-ref index is structural,
  // so a keyless `referencedBy` matches it (a routine only references its own owned instructions here).
  const byInstructions = Query.select(Filter.id(object.id))
    .referencedBy(Instructions.Instructions, 'objects')
    .referencedBy(Routine.Routine);

  return Query.all(byTrigger, byInstructions);
};

/**
 * Pure predicate equivalent of {@link connectedRoutinesQuery}, over a pre-queried list of routines.
 * Kept for unit tests (asserting the query and predicate agree) and the deferred quick-association check.
 *
 * Covers every path but the connection one: that path starts by walking O's *incoming* refs to find its
 * bindings, which a predicate holding only O and a routine list cannot do. Callers that must see an
 * account-level sync routine (the routines companion) use the query.
 */
export const routinesForObject = (object: Obj.Unknown, routines: Routine.Routine[]): Routine.Routine[] =>
  routines.filter((routine) => routineReferencesObject(routine, object));

export const routineReferencesObject = (routine: Routine.Routine, object: Obj.Unknown): boolean =>
  referencesViaTrigger(routine, object) || referencesViaInstructions(routine, object);

/**
 * Trigger path: a trigger's `input` references O (directly, or via a bound {@link Cursor} whose `spec.target`
 * is O), or a feed trigger is bound to O's feed.
 */
const referencesViaTrigger = (routine: Routine.Routine, object: Obj.Unknown): boolean => {
  const objectFeedId = getFeedId(object);
  return routine.triggers.some((ref) => {
    const trigger = ref.target;
    if (!Obj.instanceOf(Trigger.Trigger, trigger)) {
      return false;
    }

    if (trigger.spec?.kind === 'feed' && objectFeedId && trigger.spec.feed?.target?.id === objectFeedId) {
      return true;
    }

    if (trigger.input == null) {
      return false;
    }
    return referencesId(trigger.input, object.id) || referencesViaCursor(trigger.input, object.id);
  });
};

/** Instructions path: the routine's owned instructions list O in their `objects` context array. */
const referencesViaInstructions = (routine: Routine.Routine, object: Obj.Unknown): boolean =>
  Routine.instructionsRef(routine)?.target?.objects?.some((ref) => ref.target?.id === object.id) ?? false;

/** The feed id a feed-annotated object points at (e.g. `mailbox.feed`), if any. */
const getFeedId = (object: Obj.Unknown): string | undefined => {
  const feedRef = (object as { feed?: Ref.Ref<unknown> }).feed;
  return Ref.isRef(feedRef) ? feedRef.target?.id : undefined;
};

/** Recursively scan a value for a Cursor ref (e.g. a sync trigger's `binding`) that itself references O. */
const referencesViaCursor = (value: unknown, id: string): boolean => {
  if (Ref.isRef(value)) {
    const cursor = value.target;
    return Obj.instanceOf(Cursor.Cursor, cursor) && referencesId(cursor.spec, id);
  }
  if (Array.isArray(value)) {
    return value.some((entry) => referencesViaCursor(entry, id));
  }
  if (value && typeof value === 'object') {
    return Object.values(value).some((entry) => referencesViaCursor(entry, id));
  }
  return false;
};

/** Recursively scan a value for a Ref whose target is the given object id. */
const referencesId = (value: unknown, id: string): boolean => {
  if (Ref.isRef(value)) {
    return value.target?.id === id;
  }
  if (Array.isArray(value)) {
    return value.some((entry) => referencesId(entry, id));
  }
  if (value && typeof value === 'object') {
    return Object.values(value).some((entry) => referencesId(entry, id));
  }
  return false;
};
