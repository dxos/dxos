//
// Copyright 2026 DXOS.org
//

import type * as Translations from '@dxos/app-toolkit/Translations';
import { Obj } from '@dxos/echo';

import { Publication } from '#types';

/** Link previews are read by crawlers that never send a locale, so they are drawn in English. */
const LOCALE = 'en-US';

const MAX_OBJECTS = 1_000;

const { MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH, MAX_TITLE_LENGTH, MAX_TYPES } = Publication;

export type PreviewSource = {
  properties: { description?: string; icon?: string; iconHue?: string; hue?: string };
  objects: readonly Obj.Unknown[];
  resources: readonly Translations.Resource[];
};

export const buildPreview = ({ properties, objects, resources }: PreviewSource): Publication.Preview => {
  const types = new Map<string, Omit<Publication.PreviewType, 'label'>>();
  const previews: Record<string, Publication.PreviewObject> = {};
  for (const object of objects) {
    const typename = Obj.getTypename(object);
    const type = typename && typeLabel(resources, typename, 1);
    if (!typename || !type) {
      continue;
    }

    const { icon, hue } = Obj.getIcon(object) ?? {};
    const entry = types.get(typename) ?? { typename, icon, hue, count: 0 };
    types.set(typename, { ...entry, count: entry.count + 1 });

    const title = clip(Obj.getLabel(object), MAX_TITLE_LENGTH);
    if (title && Object.keys(previews).length < MAX_OBJECTS) {
      const description = clip(Obj.getDescription(object), MAX_DESCRIPTION_LENGTH);
      previews[object.id] = { title, type: clip(type, MAX_NAME_LENGTH) ?? type, icon, hue, ...(description ? { description } : {}) };
    }
  }

  return {
    description: clip(properties.description, MAX_DESCRIPTION_LENGTH),
    icon: properties.icon ? `ph--${properties.icon}--regular` : undefined,
    hue: properties.iconHue ?? properties.hue,
    types: [...types.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_TYPES)
      .map((type) => ({
        ...type,
        label: clip(typeLabel(resources, type.typename, type.count), MAX_NAME_LENGTH) ?? type.typename,
      })),
    objects: previews,
  };
};

const typeLabel = (
  resources: readonly Translations.Resource[],
  typename: string,
  count: number,
): string | undefined => {
  const keys = count === 1 ? ['typename.label_one', 'typename.label'] : ['typename.label_other', 'typename.label'];
  for (const resource of resources) {
    const namespace = resource[LOCALE]?.[typename];
    if (typeof namespace !== 'object') {
      continue;
    }
    for (const key of keys) {
      const label = namespace[key];
      if (typeof label === 'string' && label) {
        return label;
      }
    }
  }
  return undefined;
};

const clip = (text: string | undefined, length: number): string | undefined => {
  const collapsed = text?.replace(/\s+/g, ' ').trim();
  if (!collapsed) {
    return undefined;
  }
  const chars = [...collapsed];
  return chars.length > length
    ? `${chars
        .slice(0, length - 1)
        .join('')
        .trimEnd()}…`
    : collapsed;
};
