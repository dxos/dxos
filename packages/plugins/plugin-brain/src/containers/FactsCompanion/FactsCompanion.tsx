//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useEffect, useState } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { EffectEx } from '@dxos/effect';
import { type FactStoreApi, type RDF } from '@dxos/pipeline-rdf';
import { FactViewer } from '@dxos/react-ui-rdf';

import { BrainCapabilities } from '#types';

import { type FactStoreRegistry } from '../../capabilities';
import { queryFacts, useFacts } from './use-facts';

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
