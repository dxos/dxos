//
// Copyright 2024 DXOS.org
//
import { produce } from 'immer';

import {
  type LayoutAdjustment,
  type LayoutCoordinate,
  type LayoutEntry,
  type LayoutPart,
  type LayoutParts,
  SLUG_ENTRY_SEPARATOR,
  SLUG_KEY_VALUE_SEPARATOR,
  SLUG_LIST_SEPARATOR,
  SLUG_PATH_SEPARATOR,
} from '@dxos/app-framework';

import { type NewPlankPositioning } from './types';

// Part feature support
const partsThatSupportIncrement = ['main'] as LayoutPart[];

//
// --- Layout Parts Manipulation ----------------------------------------------

type OpenLayoutEntryOptions = { positioning?: NewPlankPositioning; pivotId?: string };

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
      const pivotId = options?.pivotId;

      if (pivotId) {
        const pivotIndex = layoutPart.findIndex((e) => e.id === pivotId);
        if (pivotIndex !== -1) {
          if (plankPositioning === 'start') {
            layoutPart.splice(pivotIndex, 0, entry);
          } else {
            layoutPart.splice(pivotIndex + 1, 0, entry);
          }
          return;
        }
      }

      // If no pivot found or provided, fall back to original behavior
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

export const removePart = (layout: LayoutParts, part: LayoutPart): LayoutParts => {
  return produce(layout, (draft) => {
    delete draft[part];
  });
};

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

//
// URI Projection
//

const parseLayoutEntry = (itemString: string): LayoutEntry => {
  // Layout entries are in the form of 'id~path' or just 'id'
  const [id, path] = itemString.split(SLUG_PATH_SEPARATOR);
  const entry: LayoutEntry = { id };
  if (path) {
    entry.path = path;
  }
  return entry;
};

export const uriToSoloPart = (uri: string): LayoutParts | undefined => {
  // Now after the domain part, there will be a single ID with an optional path
  const parts = uri.split('/');
  const slug = parts[parts.length - 1]; // Take the last part of the URI

  if (slug.length > 0) {
    return {
      solo: [parseLayoutEntry(slug)],
    };
  }

  return undefined;
};

export const soloPartToUri = (layout: LayoutParts): string => {
  const soloPart = layout?.solo;
  if (!soloPart || soloPart.length === 0) {
    return '';
  }

  const entry = soloPart[0];
  return `${entry.id}${entry.path ? SLUG_PATH_SEPARATOR + entry.path : ''}`;
};

/**
 * Converts a URI string into a LayoutParts object.
 * @deprecated Keeping these as a reference for now. We should remove these once we're sure we don't need them.
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

const formatLayoutEntry = ({ id, path }: LayoutEntry): string => {
  // NOTE(Zan): Format = `[SOLO_INDICATOR] ID [PATH_SEPARATOR PATH]`.
  let entry = '';
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
 * @deprecated Keeping these as a reference for now. We should remove these once we're sure we don't need them.
 */
export const activePartsToUri = (activeParts: LayoutParts): string => {
  return Object.entries(activeParts)
    .filter(([, layoutEntries]) => layoutEntries.length > 0) // Only include non-empty parts
    .map(([part, layoutEntries]) => formatPartDescriptor(part as LayoutPart, layoutEntries))
    .join(SLUG_ENTRY_SEPARATOR);
};
