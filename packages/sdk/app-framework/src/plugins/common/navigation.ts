//
// Copyright 2024 DXOS.org
//

import { z } from 'zod';

import type { IntentData } from '../IntentPlugin';
import type { Plugin } from '../PluginHost';

//
// Provides
//

/**
 * Basic state provided by a navigation plugin.
 */
// TODO(wittjosiah): Replace Zod w/ Effect Schema to align with ECHO.
// TODO(wittjosiah): We should align this more with `window.location` along the lines of what React Router does.
export const Location = z.object({
  active: z.string().optional().describe('Id of the currently active item.'),
  // TODO(wittjosiah): History?
  previous: z.string().optional(),
});

export type Location = z.infer<typeof Location>;

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
  ACTIVATE = `${NAVIGATION_ACTION}/activate`,
}

/**
 * Expected payload for navigation actions.
 */
export namespace NavigationAction {
  export type Activate = IntentData<{
    /**
     * Id to set as active.
     */
    id: string;

    /**
     * Location of the active item.
     * Defaults to 'main'.
     */
    key?: string;
  }>;
}
