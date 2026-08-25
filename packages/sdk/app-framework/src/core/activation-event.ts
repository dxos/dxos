//
// Copyright 2025 DXOS.org
//

import { DXN } from '@dxos/keys';
import { compositeKey } from '@dxos/util';

/**
 * A unique DXN identifier representing an event.
 *
 * @example dxn:org.dxos.plugin.example.event.ready
 */
export type ActivationEvent = {
  id: DXN.DXN;
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
 * Helper to define an activation event from an NSID.
 * Static NSID strings are validated at compile time via {@link DXN.Name}.
 */
export const make: {
  <T extends string>(
    nsid: [DXN.Name<T>] extends [never] ? `Invalid NSID "${T}": final segment must be camelCase (no hyphens)` : T,
    specifier?: string,
  ): ActivationEvent;
} = (nsid: string, specifier?: string): ActivationEvent => ({
  id: DXN.make(nsid),
  specifier,
});

/**
 * Helper to create an activation event key.
 */
export const eventKey = (event: ActivationEvent) =>
  event.specifier ? compositeKey(event.id, event.specifier) : event.id;

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

/**
 * Fired when the app is started.
 * Defined in core (rather than the `common` well-known events, which re-export it) because
 * the plugin manager's `start()` delegates `activate(Startup)` and publishes the
 * startup-complete message on this key.
 * @deprecated As an `activatesOn` target — declare `provides`/`requires` instead; the
 *   dependency pass replaces startup-event wiring. External callers keep using
 *   `PluginManager.activate(Startup)` (it delegates to `start()`).
 */
export const Startup = make('org.dxos.app-framework.event.startup');

/**
 * Fired once by the host at main-thread idle after the app is interactive; see the `common`
 * well-known events for the authoring-facing documentation.
 *
 * Defined here rather than only in `common` because omitting `activatesOn` normalizes to this
 * event, and `Plugin.normalizeActivation` lives in core — which cannot import `common` without
 * closing the `common -> core` cycle.
 */
export const Idle = make('org.dxos.app-framework.event.idle');

/**
 * A plugin's feature-start event, by convention `<pluginKey>.event.start`. A plugin's
 * off-critical-path modules declare `activatesOn` on its own start event (conventionally
 * exported as `<Name>Events.Start` from the plugin's types); cross-plugin contributions (a
 * skill, a markdown extension) declare the CONSUMING plugin's start event. Deriving the id
 * from the key alone lets fire sites (enable, idle, demand signals) activate a feature
 * without importing its package.
 */
export const pluginStart = (pluginKey: string | DXN.DXN) => make(`${pluginKey}.event.start`);

/**
 * Serializable reference to a single activation event, as it appears in a plugin's
 * `dxplugin.jsonc`. A bare string is the event's NSID with no specifier.
 */
export type EventRef = string | { readonly id: string; readonly specifier?: string };

/** Serializable reference to an activation condition — one event, or a `oneOf` / `allOf` of them. */
export type EventsRef = EventRef | { readonly oneOf: readonly EventRef[] } | { readonly allOf: readonly EventRef[] };

const eventFromRef = (ref: EventRef): ActivationEvent =>
  typeof ref === 'string'
    ? { id: DXN.make(ref) }
    : { id: DXN.make(ref.id), ...(ref.specifier !== undefined ? { specifier: ref.specifier } : {}) };

/** Rehydrates an activation condition from its serialized {@link EventsRef}. */
export const fromRef = (ref: EventsRef): Events => {
  if (typeof ref === 'object' && 'oneOf' in ref) {
    return oneOf(...ref.oneOf.map(eventFromRef));
  }
  if (typeof ref === 'object' && 'allOf' in ref) {
    return allOf(...ref.allOf.map(eventFromRef));
  }
  return eventFromRef(ref);
};
