//
// Copyright 2026 DXOS.org
//

import type * as AppNode from '@dxos/app-toolkit/AppNode';

import { type DeckSchema } from '#types';

export type DeckCompanionMountOptions = {
  mount?: AppNode.DeckCompanionMount;
  variant: string;
  selectedVariant?: string;
  sidebarState: DeckSchema.StoredDeckState['complementarySidebarState'];
};

export const isDeckCompanionMounted = ({
  mount = 'selected',
  variant,
  selectedVariant,
  sidebarState,
}: DeckCompanionMountOptions): boolean => {
  switch (mount) {
    case 'always':
      return true;
    case 'selected':
      return variant === selectedVariant;
    case 'open':
      return variant === selectedVariant && sidebarState === 'expanded';
  }
};
