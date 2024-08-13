//
// Copyright 2024 DXOS.org
//
import { produce } from 'immer';

import { type NewPlankPositioning } from './types';

// --- Constants --------------------------------------------------------------
export const SLUG_LIST_SEPARATOR = '+';
export const SLUG_ENTRY_SEPARATOR = '_';
export const SLUG_KEY_VALUE_SEPARATOR = '-';
export const SLUG_PATH_SEPARATOR = '~';
export const SLUG_COLLECTION_INDICATOR = '';
export const SLUG_SOLO_INDICATOR = '$';

//
// --- Types ------------------------------------------------------------------
// TODO(Zan): Rename to layout item?
export type LayoutEntry = { id: string; solo?: boolean; path?: string };

export const LAYOUT_PARTS = ['sidebar', 'main', 'complementary', 'fullScreen'] as const;
// TODO(Zan): Consider making solo it's own part. It's not really a function of the 'main' part?
// TODO(Zan): Consider renaming the 'main' part to 'deck' part now that we are throwing out the old layout plugin.
// TODO(Zan): Extend to all strings?
export type LayoutPart = (typeof LAYOUT_PARTS)[number];
export type LayoutParts = Partial<Record<LayoutPart, LayoutEntry[]>>;

export type LayoutCoordinate = { part: LayoutPart; entryId: string };

export type PartAdjustment = `increment-${'start' | 'end'}`;
// TODO(Zan): Is this adjusting the 'navigation'? For me all of this better nests under the concept of 'layout'.
export type LayoutAdjustment = { layoutCoordinate: LayoutCoordinate; type: PartAdjustment };

// Part feature support
const partsThatSupportSolo = ['main'] as LayoutPart[];
const partsThatSupportIncrement = ['main'] as LayoutPart[];

//
// --- Layout Parts Manipulation ----------------------------------------------

// TODO(Zan): Add a pivot element to this to support interspersing planks (search plugin).
type OpenLayoutEntryOptions = { positioning?: NewPlankPositioning };

export const openEntry = (
  layout: LayoutParts,
  part: LayoutPart,
  entry: LayoutEntry,
  options?: OpenLayoutEntryOptions,
): LayoutParts => {
  return produce(layout, (draft) => {
    const layoutPart = draft[part];

    // If the part doesn't exist, create it.
    if (!layoutPart) {
      draft[part] = [entry];
      return;
    }

    if (part === 'main') {
      // Check that the entry is not already in the part
      if (layoutPart.find((e) => e.id === entry.id)) {
        return;
      }

      const plankPositioning = options?.positioning ?? 'start';
      if (plankPositioning === 'start') {
        layoutPart.unshift(entry);
      } else {
        layoutPart.push(entry);
      }
    } else {
      // If the part is not main, we're going to replace the single entry in the part with the new entry.
      draft[part] = [entry];
    }
  });
};

export const closeEntry = (layout: LayoutParts, layoutCoordinate: LayoutCoordinate): LayoutParts => {
  return produce(layout, (draft) => {
    const { part, entryId: slugId } = layoutCoordinate;
    const layoutPart = draft[part];
    if (!layoutPart) {
      return;
    }

    const index = layoutPart.findIndex((entry) => entry.id === slugId);
    if (index === -1) {
      return;
    }

    // If there's only one entry in the layout part, remove the whole part from the layout.
    if (layoutPart.length === 1) {
      delete draft[part];
    } else {
      layoutPart.splice(index, 1);
    }
  });
};

export const incrementPlank = (layout: LayoutParts, adjustment: LayoutAdjustment): LayoutParts => {
  return produce(layout, (draft) => {
    const { layoutCoordinate, type } = adjustment;
    const { part, entryId } = layoutCoordinate;

    // Only allow adjustments in the 'main' part
    if (partsThatSupportIncrement.includes(part) === false) {
      return;
    }

    const layoutPart = draft[part];
    if (!layoutPart) {
      return;
    }
    const index = layoutPart.findIndex((entry) => entry.id === entryId);
    if (
      index === -1 ||
      (type === 'increment-start' && index === 0) ||
      (type === 'increment-end' && index === layoutPart.length - 1)
    ) {
      return;
    }

    if (type === 'increment-start') {
      // Swap the current item with the previous item.
      [layoutPart[index - 1], layoutPart[index]] = [layoutPart[index], layoutPart[index - 1]];
    } else if (type === 'increment-end') {
      // Swap the current item with the next item.
      [layoutPart[index], layoutPart[index + 1]] = [layoutPart[index + 1], layoutPart[index]];
    }
  });
};

export const toggleSolo = (layout: LayoutParts, layoutCoordinate: LayoutCoordinate): LayoutParts => {
  return produce(layout, (draft) => {
    const { part, entryId } = layoutCoordinate;

    if (partsThatSupportSolo.includes(part) === false) {
      return;
    }

    const layoutPart = draft[part];
    if (!layoutPart) {
      return;
    }

    const entry = layoutPart.find((entry) => entry.id === entryId);
    if (entry) {
      // TODO(Zan): If the entry is solo, remove the solo flag from all other entries in the part.
      // NOTE(Zan): This is about to change anyway so we might not need to do it.
      if (entry.solo) {
        delete entry.solo;
      } else {
        entry.solo = true;
      }
    }
  });
};

//
// --- Utilities --------------------------------------------------------------
export const mergeLayoutParts = (...layoutParts: LayoutParts[]): LayoutParts => {
  return layoutParts.reduce(
    (merged, current) =>
      produce(merged, (draft) => {
        Object.entries(current).forEach(([part, entries]) => {
          const typedPart = part as LayoutPart;

          if (!draft[typedPart]) {
            draft[typedPart] = [];
          }

          const partEntries = draft[typedPart] as LayoutEntry[];

          entries.forEach((entry) => {
            const existingIndex = partEntries.findIndex((e) => e.id === entry.id);
            if (existingIndex !== -1) {
              partEntries[existingIndex] = entry;
            } else {
              partEntries.push(entry);
            }
          });
        });
      }),
    {} as LayoutParts,
  );
};

/**
 * Extracts all unique IDs from the layout parts.
 */
export const openIds = (layout: LayoutParts): string[] => {
  return Object.values(layout)
    .flatMap((part) => part?.map((entry) => entry.id) ?? [])
    .filter((id): id is string => id !== undefined);
};

export const firstIdInPart = (layout: LayoutParts, part: LayoutPart): string | undefined => layout[part]?.at(0)?.id;

//
// --- URI Projection ---------------------------------------------------------
const parseLayoutEntry = (itemString: string): LayoutEntry => {
  const isSolo = itemString.startsWith(SLUG_SOLO_INDICATOR);
  // Layout entries are in the form of 'id~path' or just 'id'
  const [id, path] = itemString.replace(SLUG_SOLO_INDICATOR, '').split(SLUG_PATH_SEPARATOR);
  const entry: LayoutEntry = { id };
  if (path) {
    entry.path = path;
  }
  if (isSolo) {
    entry.solo = true;
  }
  return entry;
};

/**
 * Converts a URI string into a LayoutParts object.
 */
export const uriToActiveParts = (uri: string): LayoutParts => {
  const parts = uri.split('/');
  const slug = parts[parts.length - 1]; // Take the last part of the URI

  if (!slug) {
    return {}; // Return an empty object if the slug is empty
  }

  return slug.split(SLUG_ENTRY_SEPARATOR).reduce((acc: LayoutParts, partDescriptor) => {
    const [part, layoutEntry] = partDescriptor.split(SLUG_KEY_VALUE_SEPARATOR);
    if (part && layoutEntry) {
      // TODO(Zan): Remove this cast.
      acc[part as LayoutPart] = layoutEntry.split(SLUG_LIST_SEPARATOR).map(parseLayoutEntry);
    }
    return acc;
  }, {} as LayoutParts);
};

const formatLayoutEntry = ({ id, path, solo }: LayoutEntry): string => {
  // NOTE(Zan): Format = `[SOLO_INDICATOR] ID [PATH_SEPARATOR PATH]`.
  let entry = '';
  if (solo) {
    entry += SLUG_SOLO_INDICATOR;
  }
  entry += id;
  if (path) {
    entry += `${SLUG_PATH_SEPARATOR}${path}`;
  }
  return entry;
};

const formatPartDescriptor = (part: LayoutPart, layoutEntries: LayoutEntry[]): string => {
  const formattedEntries = layoutEntries.map(formatLayoutEntry).join(SLUG_LIST_SEPARATOR);
  return `${part}${SLUG_KEY_VALUE_SEPARATOR}${formattedEntries}`;
};

/**
 * Converts a LayoutParts object into a URI string.
 */
export const activePartsToUri = (activeParts: LayoutParts): string => {
  return Object.entries(activeParts)
    .filter(([, layoutEntries]) => layoutEntries.length > 0) // Only include non-empty parts
    .map(([part, layoutEntries]) => formatPartDescriptor(part as LayoutPart, layoutEntries))
    .join(SLUG_ENTRY_SEPARATOR);
};
