//
// Copyright 2025 DXOS.org
//

import { type Trigger, type TriggerEvent } from '../types';

export const createInvocationPayload = (trigger: Trigger.Trigger, event: TriggerEvent.TriggerEvent): any => {
  if (!trigger.input) {
    return event;
  }

  const payload: any = {};
  for (const [key, value] of Object.entries(trigger.input)) {
    if (typeof value !== 'string' || !(value.startsWith('{{') && value.endsWith('}}'))) {
      payload[key] = value;
      continue;
    }

    const propertyPath = value.slice(2, -2);
    let valueSubstitution: any = propertyPath.startsWith('trigger.')
      ? trigger
      : propertyPath.startsWith('event.')
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
