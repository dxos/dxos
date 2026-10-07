//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Trigger from '@dxos/compute/Trigger';
import * as TriggerEvent from '@dxos/compute/TriggerEvent';
import { Filter, Query } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';

// Kept out of `Trigger.tsx` and shared with `trigger-def.ts`: react-refresh only fast-refreshes a
// module whose exports are all components, and a value import back from the def module would close
// a runtime cycle.

export const createTriggerSpec = (props: { triggerKind?: Trigger.Kind; spaceId?: SpaceId }): Trigger.Spec => {
  const kind = props.triggerKind ?? 'email';
  switch (kind) {
    case 'timer':
      return Trigger.specTimer('* * * * *');
    case 'webhook':
      return Trigger.specWebhook({ method: 'POST' });
    case 'subscription':
      return Trigger.specSubscription(Query.select(Filter.nothing()));
    case 'email':
      return Trigger.specEmail();
    case 'feed': {
      return { kind: 'feed' } satisfies Trigger.FeedSpec;
    }
    case 'direct':
      return Trigger.specDirect();
  }
};

export const getOutputSchema = (kind: Trigger.Kind) => {
  const kindToSchema: Record<Trigger.Kind, Schema.Schema<any>> = {
    ['email']: TriggerEvent.EmailEvent,
    ['subscription']: TriggerEvent.SubscriptionEvent,
    ['timer']: TriggerEvent.TimerEvent,
    ['webhook']: TriggerEvent.WebhookEvent,
    ['feed']: TriggerEvent.FeedEvent,
    ['direct']: TriggerEvent.DirectEvent,
  };
  return kindToSchema[kind];
};
