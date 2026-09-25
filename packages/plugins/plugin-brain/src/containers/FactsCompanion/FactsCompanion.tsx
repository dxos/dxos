//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { FactViewer } from '@dxos/react-ui-rdf';

import { BrainCapabilities } from '#types';

import { type FactStoreRegistry } from '../../capabilities/fact-store.ts';
import { useFacts } from './use-facts.ts';

/**
 * Companion surface rendering the semantic facts extracted for the active space. Reads the shared
 * per-space {@link FactStoreRegistry} (populated by the analysis pipeline) and hands its facts to the
 * presentational {@link FactViewer}. Space-scoped via {@link useActiveSpace} — no container coupling.
 */
export const FactsCompanion = () => {
  const registry = useCapability(BrainCapabilities.FactStoreRegistry);
  const space = useActiveSpace();
  const facts = useFacts(registry, space?.id);
  return <FactViewer.Root facts={facts} />;
};

FactsCompanion.displayName = 'FactsCompanion';
