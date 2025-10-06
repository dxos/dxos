//
// Copyright 2025 DXOS.org
//

import { type ChromaticPalette } from '@dxos/react-ui';

export type QueryTag = {
  id: string;
  label: string;
  hue?: ChromaticPalette;
};

export type QueryText = {
  content: string;
};

export type QueryItem = QueryText | QueryTag;

export const itemIsTag = (item: Record<string, string>): item is QueryTag => {
  return 'id' in item && typeof item.id === 'string' && 'label' in item && typeof item.label === 'string';
};

export const itemIsText = (item: Record<string, string>): item is QueryText => {
  return 'content' in item && typeof item.content === 'string';
};
