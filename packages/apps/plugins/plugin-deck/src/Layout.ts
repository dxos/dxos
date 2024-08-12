//
// Copyright 2024 DXOS.org
//

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

// TODO(Zan): Consider making solo it's own part. It's not really a function of the 'main' part?
// TODO(Zan): Consider renaming the 'main' part to 'deck' part now that we are throwing out the old layout plugin.
// TODO(Zan): Extend to all strings?
export type LayoutPart = 'sidebar' | 'main' | 'complementary';
export type LayoutParts = Partial<Record<LayoutPart, LayoutEntry[]>>;

export type LayoutCoordinate = { part: LayoutPart; slugId: string };

export type PartAdjustment = `pin-${'start' | 'end'}`;
// TODO(Zan): Is this adjusting the 'navigation'? For me all of this better nests under the concept of 'layout'.
export type LayoutAdjustment = { layoutCoordinate: LayoutCoordinate; type: PartAdjustment };

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

export const activePartsToUri = (activeParts: LayoutParts): string => {
  return Object.entries(activeParts)
    .filter(([, layoutEntries]) => layoutEntries.length > 0) // Only include non-empty parts
    .map(([part, layoutEntries]) => formatPartDescriptor(part as LayoutPart, layoutEntries))
    .join(SLUG_ENTRY_SEPARATOR);
};
