//
// Copyright 2023 DXOS.org
//

import { type Location, isActiveParts, type ActiveParts } from '@dxos/app-framework';

// NOTE(thure): These are chosen fromRFC 1738’s `safe` characters: http://www.faqs.org/rfcs/rfc1738.html
const LIST_SEPARATOR = '.';
const ENTRY_SEPARATOR = '_';
const KEY_VALUE_SEPARATOR = '-';

export const uriToActive = (uri: string): Location['active'] => {
  const [_, slug] = uri.split('/');
  return slug
    ? slug.split(ENTRY_SEPARATOR).reduce((acc: ActiveParts, slugEntry) => {
        const [part, idsSlug] = slugEntry.split(KEY_VALUE_SEPARATOR);
        acc[part] = idsSlug.split(LIST_SEPARATOR);
        return acc;
      }, {})
    : undefined;
};

export const firstMainId = (active: Location['active']): string =>
  isActiveParts(active) ? (Array.isArray(active.main) ? active.main[0] : active.main) : active ?? '';

export const activeToUri = (active?: Location['active']) =>
  `/${
    active
      ? Object.entries(active)
          .map(([part, ids]) => `${part}${KEY_VALUE_SEPARATOR}${Array.isArray(ids) ? ids.join(LIST_SEPARATOR) : ids}`)
          .join(ENTRY_SEPARATOR)
      : ''
  }`;
