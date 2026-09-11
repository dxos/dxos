//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { Attention } from '@dxos/react-ui-attention/types';

import { DeckSchema } from '#types';

/**
 * Resolves which companion to show based on variant preference.
 * Falls back to the help tab, then to the first available.
 */
export const useSelectedCompanion = (companions: AppGraphNode.Node[], preferredVariant?: string) => {
  return useMemo(() => {
    const selected = DeckSchema.selectCompanion(companions, preferredVariant);
    return selected
      ? { companionId: selected.id, variant: Attention.getLinkedVariant(selected.id) }
      : { companionId: undefined, variant: undefined };
  }, [companions, preferredVariant]);
};
