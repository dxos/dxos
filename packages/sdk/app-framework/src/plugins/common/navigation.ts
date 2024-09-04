//
// Copyright 2024 DXOS.org
//

import { z } from 'zod';

import { S } from '@dxos/echo-schema';

import type { IntentData } from '../IntentPlugin';
import type { Plugin } from '../PluginHost';

// NOTE(thure): These are chosen from RFC 1738’s `safe` characters: http://www.faqs.org/rfcs/rfc1738.html
export const SLUG_LIST_SEPARATOR = '+';
export const SLUG_ENTRY_SEPARATOR = '_';
export const SLUG_KEY_VALUE_SEPARATOR = '-';
export const SLUG_PATH_SEPARATOR = '~';
export const SLUG_COLLECTION_INDICATOR = '';

const LayoutEntrySchema = S.mutable(S.Struct({ id: S.String, path: S.optional(S.String) }));
export type LayoutEntry = S.Schema.Type<typeof LayoutEntrySchema>;

// TODO(Zan): Consider making solo it's own part. It's not really a function of the 'main' part?
// TODO(Zan): Consider renaming the 'main' part to 'deck' part now that we are throwing out the old layout plugin.
// TODO(Zan): Extend to all strings?
const LayoutPartSchema = S.Union(
  S.Literal('sidebar'),
  S.Literal('main'),
  S.Literal('solo'),
  S.Literal('complementary'),
  S.Literal('fullScreen'),
);
export type LayoutPart = S.Schema.Type<typeof LayoutPartSchema>;

const LayoutPartsSchema = S.partial(S.mutable(S.Record(LayoutPartSchema, S.mutable(S.Array(LayoutEntrySchema)))));
export type LayoutParts = S.Schema.Type<typeof LayoutPartsSchema>;

const LayoutCoordinateSchema = S.mutable(S.Struct({ part: LayoutPartSchema, entryId: S.String }));
export type LayoutCoordinate = S.Schema.Type<typeof LayoutCoordinateSchema>;

const PartAdjustmentSchema = S.Union(S.Literal('increment-start'), S.Literal('increment-end'), S.Literal('solo'));
export type PartAdjustment = S.Schema.Type<typeof PartAdjustmentSchema>;

const LayoutAdjustmentSchema = S.mutable(
  S.Struct({ layoutCoordinate: LayoutCoordinateSchema, type: PartAdjustmentSchema }),
);
export type LayoutAdjustment = S.Schema.Type<typeof LayoutAdjustmentSchema>;

/** @deprecated */
export const ActiveParts = z.record(z.string(), z.union([z.string(), z.array(z.string())]));
export type ActiveParts = z.infer<typeof ActiveParts>;

/**
 * Basic state provided by a navigation plugin.
 */
export const Attention = z.object({
  attended: z.set(z.string()).optional().describe('Ids of items which have focus.'),
});
export type Attention = z.infer<typeof Attention>;

/**
 * Provides for a plugin that can manage the app navigation.
 */
const LocationProvidesSchema = S.mutable(
  S.Struct({
    location: S.Struct({
      active: LayoutPartsSchema,
      closed: S.Array(S.String),
    }),
  }),
);
export type LocationProvides = S.Schema.Type<typeof LocationProvidesSchema>;

/**
 * Type guard for layout plugins.
 */
export const isLayoutParts = (value: unknown): value is LayoutParts => {
  return S.is(LayoutPartsSchema)(value);
};

// Type guard for PartAdjustment
export const isLayoutAdjustment = (value: unknown): value is LayoutAdjustment => {
  return S.is(LayoutAdjustmentSchema)(value);
};

export const parseNavigationPlugin = (plugin: Plugin): Plugin<LocationProvides> | undefined => {
  const location = (plugin.provides as any)?.location;
  if (!location) {
    return undefined;
  }

  if (S.is(LocationProvidesSchema)({ location })) {
    return plugin as Plugin<LocationProvides>;
  }

  return undefined;
};

/**
 * Utilities.
 */

/** Extracts all unique IDs from the layout parts. */
export const openIds = (layout: LayoutParts): string[] => {
  return Object.values(layout)
    .flatMap((part) => part?.map((entry) => entry.id) ?? [])
    .filter((id): id is string => id !== undefined);
};

export const firstIdInPart = (layout: LayoutParts | undefined, part: LayoutPart): string | undefined => {
  if (!layout) {
    return undefined;
  }

  return layout[part]?.at(0)?.id;
};

export const indexInPart = (
  layout: LayoutParts | undefined,
  layoutCoordinate: LayoutCoordinate | undefined,
): number | undefined => {
  if (!layout || !layoutCoordinate) {
    return undefined;
  }

  const { part, entryId } = layoutCoordinate;
  return layout[part]?.findIndex((entry) => entry.id === entryId);
};

export const partLength = (layout: LayoutParts | undefined, part: LayoutPart | undefined): number => {
  if (!layout || !part) {
    return 0;
  }

  return layout[part]?.length ?? 0;
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
  EXPOSE = `${NAVIGATION_ACTION}/expose`,
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
    part: LayoutPart;
    id: string;
    scrollIntoView?: boolean;
    pivotId?: string;
    positioning?: 'start' | 'end';
  }>;

  /**
   * A subtractive overlay to apply to `location.active` (i.e. the result is a subtraction from the previous active of the argument)
   */
  export type Close = IntentData<{ activeParts: ActiveParts; noToggle?: boolean }>;

  /**
   * The active parts to directly set, to be used when working with URLs or restoring a specific state.
   */
  export type Set = IntentData<{ activeParts: ActiveParts }>;

  /**
   * An atomic transaction to apply to `location.active`, describing which element to (attempt to) move to which location.
   */
  export type Adjust = IntentData<LayoutAdjustment>;
}
