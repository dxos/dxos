//
// Copyright 2026 DXOS.org
//

import { Trigger } from '@dxos/compute';
import { Filter, Obj, Query, Ref } from '@dxos/echo';

import { Automation } from '#types';

/**
 * Reactive query for the automations connected to an object O — without a stored association field.
 *
 * Association is derived: an automation is connected when one of its triggers references O, either via a
 * `Ref` anywhere in the trigger's `input` (e.g. a magazine passed into AgentPrompt's input) or via a feed
 * trigger whose `spec.feed` resolves to `O.feed` (feed-annotated hosts like mailboxes). Both are reachable
 * by reverse-reference traversal because ECHO's reverse-ref index is structural — it records every ref in a
 * document regardless of schema path (incl. untyped records and union-nested fields). The traversal is two
 * hops: O ← Trigger ← Automation.
 */
export const connectedAutomationsQuery = (object: Obj.Unknown): Query.Query<Automation.Automation> => {
  // Triggers referencing O directly (any path, incl. nested in the untyped `input` record).
  const byInput = Query.select(Filter.id(object.id)).referencedBy(Trigger.Trigger);
  // Triggers referencing O's feed; `.reference('feed')` reads the path structurally and is empty for objects
  // without a feed prop, so this branch contributes nothing for non-feed objects.
  const byFeed = Query.select(Filter.id(object.id)).reference('feed').referencedBy(Trigger.Trigger);
  return Query.all(byInput, byFeed).referencedBy(Automation.Automation, 'triggers');
};

/**
 * Pure predicate equivalent of {@link connectedAutomationsQuery}, over a pre-queried list of automations.
 * Kept for unit tests (asserting the query and predicate agree) and the deferred quick-association check.
 */
export const automationsForObject = (
  object: Obj.Unknown,
  automations: Automation.Automation[],
): Automation.Automation[] => automations.filter((automation) => automationReferencesObject(automation, object));

export const automationReferencesObject = (automation: Automation.Automation, object: Obj.Unknown): boolean => {
  const objectFeedId = getFeedId(object);
  return automation.triggers.some((ref) => {
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
