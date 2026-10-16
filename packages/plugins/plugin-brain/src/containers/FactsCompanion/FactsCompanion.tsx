//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import { FactViewer } from '@dxos/react-ui-rdf';

import { useFacts } from './use-facts.ts';

/**
 * Companion surface rendering the facts the active space's agents know (filled by the analysis pipeline) through the
 * presentational {@link FactViewer}. Space-scoped via {@link useActiveSpace} — no container coupling.
 */
export const FactsCompanion = () => {
  const space = ToolkitHooks.useActiveSpace();
  const facts = useFacts(space?.id);
  return <FactViewer.Root facts={facts} />;
};

FactsCompanion.displayName = 'FactsCompanion';
