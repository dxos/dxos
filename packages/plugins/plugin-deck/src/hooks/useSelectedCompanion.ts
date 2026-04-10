//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type Node } from '@dxos/plugin-graph';
import { getLinkedVariant } from '@dxos/react-ui-attention';

/**
 * Resolves which companion to show based on variant preference.
 * Falls back to first available if preferred variant not found.
 */
export const useSelectedCompanion = (companions: Node.Node[], preferredVariant?: string) => {
  return useMemo(() => {
    if (companions.length === 0) {
      return { companionId: undefined, variant: undefined };
    }

    // Try to find companion matching the preferred variant.
    if (preferredVariant) {
      const preferred = companions.find((companion) => getLinkedVariant(companion.id) === preferredVariant);
      if (preferred) {
        return { companionId: preferred.id, variant: getLinkedVariant(preferred.id) };
      }
    }

    // Fallback to first companion.
    const first = companions[0];
    return { companionId: first.id, variant: getLinkedVariant(first.id) };
  }, [companions, preferredVariant]);
};
