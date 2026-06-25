//
// Copyright 2026 DXOS.org
//

import { Instructions, Trigger } from '@dxos/compute';
import { Filter, Obj, Query, Ref } from '@dxos/echo';

import { Routine } from '#types';

import { runnableInstructions } from './run-instructions';

/**
 * Reactive query for all routines connected to an object O, via two structural paths:
 *
 * 1. **Trigger path** (two hops): O is referenced by a Trigger (via `input` or `spec.feed`), and that
 *    Trigger is referenced by a Routine's `triggers` array.
 * 2. **Instructions path** (two hops): O is listed in an Instructions' `objects` context array, and those
 *    Instructions are the Routine's `runnable`. Both hops traverse `Ref` fields, so they are fully
 *    queryable — no JavaScript parent-symbol traversal needed.
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
  const byTrigger = Query.all(byInput, byFeed).referencedBy(Routine.Routine, 'triggers');

  // Instructions path: O ← Instructions.objects ← Routine.runnable.
  const byInstructions = Query.select(Filter.id(object.id))
    .referencedBy(Instructions.Instructions, 'objects')
    .referencedBy(Routine.Routine, 'runnable');

  return Query.all(byTrigger, byInstructions);
};

/**
 * Pure predicate equivalent of {@link connectedRoutinesQuery}, over a pre-queried list of routines.
 * Kept for unit tests (asserting the query and predicate agree) and the deferred quick-association check.
 */
export const routinesForObject = (object: Obj.Unknown, routines: Routine.Routine[]): Routine.Routine[] =>
  routines.filter((routine) => routineReferencesObject(routine, object));

export const routineReferencesObject = (routine: Routine.Routine, object: Obj.Unknown): boolean =>
  referencesViaTrigger(routine, object) || referencesViaInstructions(routine, object);

/** Trigger path: a trigger's `input` references O, or a feed trigger is bound to O's feed. */
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

    return trigger.input != null && referencesId(trigger.input, object.id);
  });
};

/** Instructions path: the routine's runnable instructions list O in their `objects` context array. */
const referencesViaInstructions = (routine: Routine.Routine, object: Obj.Unknown): boolean =>
  runnableInstructions(routine.runnable)?.objects?.some((ref) => ref.target?.id === object.id) ?? false;

/** The feed id a feed-annotated object points at (e.g. `mailbox.feed`), if any. */
const getFeedId = (object: Obj.Unknown): string | undefined => {
  const feedRef = (object as { feed?: Ref.Ref<unknown> }).feed;
  return Ref.isRef(feedRef) ? feedRef.target?.id : undefined;
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
