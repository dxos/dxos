//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type Node } from '@dxos/plugin-graph';

import { parseEntryId } from '../layout';

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
      const preferred = companions.find((companion) => {
        const { variant } = parseEntryId(companion.id);
        return variant === preferredVariant;
      });
      if (preferred) {
        const { variant } = parseEntryId(preferred.id);
        return { companionId: preferred.id, variant };
      }
    }

    // Fallback to first companion.
    const first = companions[0];
    const { variant } = parseEntryId(first.id);
    return { companionId: first.id, variant };
  }, [companions, preferredVariant]);
};
