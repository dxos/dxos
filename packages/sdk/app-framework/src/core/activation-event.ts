//
// Copyright 2025 DXOS.org
//

/**
 * A unique string identifier representing an event.
 * This is expected to be a URI, where initial parts are often the id of the plugin whose package defines the event.
 *
 * @example dxos.org/plugin/example/event/ready
 */
export type ActivationEvent = {
  id: string;
  specifier?: string;
};

/**
 * An activation event that can be a single event, or a combination of events.
 */
export type Events =
  | ActivationEvent
  | { type: 'one-of'; events: ActivationEvent[] }
  | { type: 'all-of'; events: ActivationEvent[] };

/**
 * Helper to define an activation event.
 */
export const make = (id: string, specifier?: string) => {
  return { id, specifier } as ActivationEvent;
};

/**
 * Helper to create an activation event key.
 */
export const eventKey = (event: ActivationEvent) => (event.specifier ? `${event.id}:${event.specifier}` : event.id);

/**
 * Helper to create an activation event that triggers when any of the given events are activated.
 */
export const oneOf = (...events: ActivationEvent[]) => ({ type: 'one-of' as const, events });

/**
 * Helper to create an activation event that triggers when all of the given events are activated.
 */
export const allOf = (...events: ActivationEvent[]) => ({ type: 'all-of' as const, events });

/**
 * Helper to check if an activation event is a one-of event.
 */
export const isOneOf = (events: Events): events is { type: 'one-of'; events: ActivationEvent[] } =>
  'type' in events && events.type === 'one-of';

/**
 * Helper to check if an activation event is an all-of event.
 */
export const isAllOf = (events: Events): events is { type: 'all-of'; events: ActivationEvent[] } =>
  'type' in events && events.type === 'all-of';

/**
 * Helper to get the events from an activation event.
 */
export const getEvents = (events: Events) => ('type' in events ? events.events : [events]);
