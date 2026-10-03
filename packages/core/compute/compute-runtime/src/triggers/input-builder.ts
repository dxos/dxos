//
// Copyright 2025 DXOS.org
//

import type * as Trigger from '@dxos/compute/Trigger';
import type * as TriggerEvent from '@dxos/compute/TriggerEvent';
import { parseTemplatePlaceholder } from '@dxos/util';

export const createInvocationPayload = (trigger: Trigger.Trigger, event: TriggerEvent.TriggerEvent): any => {
  if (!trigger.input) {
    return event;
  }

  const payload: any = {};
  for (const [key, value] of Object.entries(trigger.input)) {
    const propertyPath = typeof value === 'string' ? parseTemplatePlaceholder(value) : undefined;
    if (propertyPath === undefined) {
      payload[key] = value;
      continue;
    }

    let valueSubstitution: any = propertyPath.startsWith('trigger')
      ? trigger
      : propertyPath.startsWith('event')
        ? event
        : undefined;

    for (const pathSegment of propertyPath.split('.').slice(1)) {
      if (valueSubstitution && typeof valueSubstitution === 'object') {
        valueSubstitution = valueSubstitution[pathSegment];
      }
    }

    payload[key] = valueSubstitution;
  }
  return payload;
};

export interface TriggerInput {
  trigger: Trigger.Trigger;
  event: TriggerEvent.TriggerEvent;
}
