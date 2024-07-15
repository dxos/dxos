//
// Copyright 2024 DXOS.org
//

import { z } from 'zod';

import type { IntentData } from '../IntentPlugin';
import type { Plugin } from '../PluginHost';

// NOTE(thure): These are chosen from RFC 1738’s `safe` characters: http://www.faqs.org/rfcs/rfc1738.html
export const SLUG_LIST_SEPARATOR = '+';
export const SLUG_ENTRY_SEPARATOR = '_';
export const SLUG_KEY_VALUE_SEPARATOR = '-';
export const SLUG_PATH_SEPARATOR = '~';
export const SLUG_COLLECTION_INDICATOR = '';

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

export const Attention = z.object({
  attended: z.set(z.string()).optional().describe('Ids of items which have focus.'),
});

export type ActiveParts = z.infer<typeof ActiveParts>;
export type Location = z.infer<typeof Location>;
export type Attention = z.infer<typeof Attention>;

export type LayoutCoordinate = { part: string; index: number; partSize: number };
export type NavigationAdjustmentType = `${'pin' | 'increment'}-${'start' | 'end'}`;
export type NavigationAdjustment = { layoutCoordinate: LayoutCoordinate; type: NavigationAdjustmentType };

export const isActiveParts = (active: string | ActiveParts | undefined): active is ActiveParts =>
  !!active && typeof active !== 'string';

export const isAdjustTransaction = (data: IntentData | undefined): data is NavigationAdjustment =>
  !!data &&
  ('layoutCoordinate' satisfies keyof NavigationAdjustment) in data &&
  ('type' satisfies keyof NavigationAdjustment) in data;

export const firstMainId = (active: Location['active']): string =>
  isActiveParts(active) ? (Array.isArray(active.main) ? active.main[0] : active.main) : active ?? '';

export const activeIds = (active: string | ActiveParts | undefined): Set<string> =>
  active
    ? isActiveParts(active)
      ? Object.values(active).reduce((acc, ids) => {
          Array.isArray(ids) ? ids.forEach((id) => acc.add(id)) : acc.add(ids);
          return acc;
        }, new Set<string>())
      : new Set([active])
    : new Set();

export const isIdActive = (active: string | ActiveParts | undefined, id: string): boolean => {
  return active
    ? isActiveParts(active)
      ? Object.values(active).findIndex((ids) => (Array.isArray(ids) ? ids.indexOf(id) > -1 : ids === id)) > -1
      : active === id
    : false;
};

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
  ADD_TO_ACTIVE = `${NAVIGATION_ACTION}/add-to-active`,
  SET = `${NAVIGATION_ACTION}/set`,
  ADJUST = `${NAVIGATION_ACTION}/adjust`,
  CLOSE = `${NAVIGATION_ACTION}/close`,
}

/**
 * Expected payload for navigation actions.
 */
export namespace NavigationAction {
  /**
   * An additive overlay to apply to `location.active` (i.e. the result is a union of previous active and the argument)
   */
  export type Open = IntentData<{ activeParts: ActiveParts }>;
  /**
   * Payload for adding an item to the active items.
   */
  export type AddToActive = IntentData<{
    id: string;
    scrollIntoView?: boolean;
    pivot?: { id: string; position: 'add-before' | 'add-after' };
  }>;
  /**
   * A subtractive overlay to apply to `location.active` (i.e. the result is a subtraction from the previous active of the argument)
   */
  export type Close = IntentData<{ activeParts: ActiveParts }>;
  /**
   * The active parts to directly set, to be used when working with URLs or restoring a specific state.
   */
  export type Set = IntentData<{ activeParts: ActiveParts }>;
  /**
   * An atomic transaction to apply to `location.active`, describing which element to (attempt to) move to which location.
   */
  export type Adjust = IntentData<NavigationAdjustment>;
}
