//
// Copyright 2024 DXOS.org
//

import { z } from 'zod';

import type { IntentData } from '../IntentPlugin';
import type { Plugin } from '../PluginHost';

//
// Provides
//

export const ActiveParts = z.record(z.string(), z.union([z.string(), z.array(z.string())]));

/**
 * Basic state provided by a navigation plugin.
 */
// TODO(wittjosiah): Replace Zod w/ Effect Schema to align with ECHO.
// TODO(wittjosiah): We should align this more with `window.location` along the lines of what React Router does.
export const Location = z.object({
  active: z
    .union([z.string(), ActiveParts])
    .optional()
    .describe('Id of currently active item, or record of item id(s) keyed by the app part in which they are active.'),
  closed: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('Id or ids of recently closed items, in order of when they were closed.'),
});

export type ActiveParts = z.infer<typeof ActiveParts>;
export type Location = z.infer<typeof Location>;

export const isActiveParts = (active: string | ActiveParts | undefined): active is ActiveParts =>
  !!active && typeof active !== 'string';

/**
 * Provides for a plugin that can manage the app navigation.
 */
export type LocationProvides = {
  location: Readonly<Location>;
};

/**
 * Type guard for layout plugins.
 */
export const parseNavigationPlugin = (plugin: Plugin) => {
  const { success } = Location.safeParse((plugin.provides as any).location);
  return success ? (plugin as Plugin<LocationProvides>) : undefined;
};

//
// Intents
//

const NAVIGATION_ACTION = 'dxos.org/plugin/navigation';
export enum NavigationAction {
  OPEN = `${NAVIGATION_ACTION}/open`,
  CLOSE = `${NAVIGATION_ACTION}/close`,
}

/**
 * Expected payload for navigation actions.
 */
export namespace NavigationAction {
  export type Open = IntentData<ActiveParts>;
  export type Close = IntentData<ActiveParts>;
}
