//
// Copyright 2023 DXOS.org
//

import {
  type Location,
  isActiveParts,
  type ActiveParts,
  SLUG_ENTRY_SEPARATOR,
  SLUG_KEY_VALUE_SEPARATOR,
  SLUG_LIST_SEPARATOR,
} from '@dxos/app-framework';

export const uriToActive = (uri: string): Location['active'] => {
  const [_, slug] = uri.split('/');
  return slug
    ? slug.split(SLUG_ENTRY_SEPARATOR).reduce((acc: ActiveParts, slugEntry) => {
        const [part, idsSlug] = slugEntry.split(SLUG_KEY_VALUE_SEPARATOR);
        if (part && idsSlug) {
          acc[part] = idsSlug.split(SLUG_LIST_SEPARATOR);
        }
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
          .map(([part, ids]) =>
            (Array.isArray(ids) ? ids.filter(Boolean).length > 0 : !!ids)
              ? `${part}${SLUG_KEY_VALUE_SEPARATOR}${Array.isArray(ids) ? ids.filter(Boolean).join(SLUG_LIST_SEPARATOR) : ids}`
              : '',
          )
          .filter((slug) => slug.length > 0)
          .join(SLUG_ENTRY_SEPARATOR)
      : ''
  }`;
