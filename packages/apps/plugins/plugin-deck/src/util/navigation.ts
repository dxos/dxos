//
// Copyright 2023 DXOS.org
//

import { type Location, isActiveParts } from '@dxos/app-framework';

export const uriToActive = (uri: string): Location['active'] => {
  const [_, ...nodeId] = uri.split('/');
  return nodeId ? nodeId.map(decodeURIComponent).join(':') : undefined;
};

export const firstMainId = (active: Location['active']): string =>
  isActiveParts(active) ? (Array.isArray(active.main) ? active.main[0] : active.main) : active ?? '';

export const activeToUri = (active?: Location['active']) =>
  '/' + firstMainId(active).split(':').map(encodeURIComponent).join('/');
