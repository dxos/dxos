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
 * Reserved specifier meaning "the key of the plugin this module belongs to". A maker can declare
 * a plugin-scoped default event without knowing the plugin (module ids are assigned at
 * `Plugin.addModule`); the placeholder is substituted with the real key when the module is
 * resolved against its plugin meta.
 */
export const OWN_PLUGIN_SPECIFIER = ':own-plugin:';

/**
 * Substitutes {@link OWN_PLUGIN_SPECIFIER} with the plugin key across an events declaration.
 * Events without the placeholder pass through unchanged.
 */
export const resolveOwnPlugin = (events: Events, pluginKey: string): Events => {
  const resolve = (event: ActivationEvent): ActivationEvent =>
    event.specifier === OWN_PLUGIN_SPECIFIER ? { ...event, specifier: pluginKey } : event;
  if ('type' in events) {
    return { type: events.type, events: events.events.map(resolve) };
  }
  return resolve(events);
};

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
 * A plugin's feature-start event, by convention `<pluginKey>.event.start`. A plugin's
 * off-critical-path modules declare `activatesOn` on its own start event (conventionally
 * exported as `<Name>Events.Start` from the plugin's types); cross-plugin contributions (a
 * skill, a markdown extension) declare the CONSUMING plugin's start event. Deriving the id
 * from the key alone lets fire sites (enable, idle, demand signals) activate a feature
 * without importing its package.
 */
export const pluginStart = (pluginKey: string | DXN.DXN) => make(`${pluginKey}.event.start`);
