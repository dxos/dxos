//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';

import { pick } from '@dxos/util';

import { type Plugin } from '../plugin-host';

// NOTE(thure): These are chosen from RFC 1738’s `safe` characters: http://www.faqs.org/rfcs/rfc1738.html
export const SLUG_LIST_SEPARATOR = '+';
export const SLUG_ENTRY_SEPARATOR = '_';
export const SLUG_KEY_VALUE_SEPARATOR = '-';
export const SLUG_PATH_SEPARATOR = '~';
export const SLUG_COLLECTION_INDICATOR = '';

const LayoutEntrySchema = S.mutable(S.Struct({ id: S.String, path: S.optional(S.String) }));
export type LayoutEntry = S.Schema.Type<typeof LayoutEntrySchema>;

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

const LayoutPartsSchema = S.partial(
  S.mutable(S.Record({ key: LayoutPartSchema, value: S.mutable(S.Array(LayoutEntrySchema)) })),
);
export type LayoutParts = S.Schema.Type<typeof LayoutPartsSchema>;

const LayoutCoordinateSchema = S.mutable(S.Struct({ part: LayoutPartSchema, entryId: S.String }));
export type LayoutCoordinate = S.Schema.Type<typeof LayoutCoordinateSchema>;

const PartAdjustmentSchema = S.Union(
  S.Literal('increment-start'),
  S.Literal('increment-end'),
  S.Literal('pin-start'),
  S.Literal('pin-end'),
  S.Literal('close'),
  S.Literal('solo'),
);
export type PartAdjustment = S.Schema.Type<typeof PartAdjustmentSchema>;

const LayoutAdjustmentSchema = S.mutable(
  S.Struct({ layoutCoordinate: LayoutCoordinateSchema, type: PartAdjustmentSchema }),
);
export type LayoutAdjustment = S.Schema.Type<typeof LayoutAdjustmentSchema>;

/** @deprecated */
export const ActiveParts = S.Record({ key: S.String, value: S.Union(S.String, S.mutable(S.Array(S.String))) });
export type ActiveParts = S.Schema.Type<typeof ActiveParts>;

// TODO(burdon): Where should this go?
export type LayoutContainerProps<T> = T & { role?: string; coordinate?: LayoutCoordinate };

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

// Type guard for PartAdjustment.
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
export const openIds = (layout: LayoutParts, parts?: LayoutPart[]): string[] => {
  return Object.values(parts ? pick(layout, parts) : layout)
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

export const NAVIGATION_PLUGIN = 'dxos.org/plugin/navigation';
export const NAVIGATION_ACTION = `${NAVIGATION_PLUGIN}/action`;

/**
 * Expected payload for navigation actions.
 */
// TODO(wittjosiah): These seem to be too deck-specific.
export namespace NavigationAction {
  /**
   * An additive overlay to apply to `location.active` (i.e. the result is a union of previous active and the argument)
   */
  export class Open extends S.TaggedClass<Open>()(`${NAVIGATION_ACTION}/open`, {
    input: S.Struct({
      activeParts: ActiveParts,
      noToggle: S.optional(S.Boolean),
    }),
    output: S.Struct({
      open: S.Array(S.String),
    }),
  }) {}

  /**
   * Payload for adding an item to the active items.
   */
  export class AddToActive extends S.TaggedClass<AddToActive>()(`${NAVIGATION_ACTION}/add-to-active`, {
    input: S.Struct({
      id: S.String,
      part: LayoutPartSchema,
      scrollIntoView: S.optional(S.Boolean),
      pivotId: S.optional(S.String),
      positioning: S.optional(S.Literal('start', 'end')),
    }),
    output: S.Void,
  }) {}

  /**
   * The active parts to directly set, to be used when working with URLs or restoring a specific state.
   */
  export class Set extends S.TaggedClass<Set>()(`${NAVIGATION_ACTION}/set`, {
    input: S.Struct({
      activeParts: ActiveParts,
    }),
    output: S.Void,
  }) {}

  /**
   * A subtractive overlay to apply to `location.active` (i.e. the result is a subtraction from the previous active of the argument)
   */
  export class Close extends S.TaggedClass<Close>()(`${NAVIGATION_ACTION}/close`, {
    input: S.Struct({
      activeParts: ActiveParts,
      noToggle: S.optional(S.Boolean),
    }),
    output: S.Void,
  }) {}

  /**
   * An atomic transaction to apply to `location.active`, describing which element to (attempt to) move to which location.
   */
  export class Adjust extends S.TaggedClass<Adjust>()(`${NAVIGATION_ACTION}/adjust`, {
    input: LayoutAdjustmentSchema,
    output: S.Void,
  }) {}

  // TODO(wittjosiah): This action seems unrelated to the others.
  export class Expose extends S.TaggedClass<Expose>()(`${NAVIGATION_ACTION}/expose`, {
    input: S.Struct({
      id: S.String,
    }),
    output: S.Void,
  }) {}
}
