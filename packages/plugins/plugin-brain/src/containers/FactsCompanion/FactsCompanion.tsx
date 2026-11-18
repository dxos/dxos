//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { FactViewer } from '@dxos/react-ui-rdf';

import { useFacts } from './use-facts.ts';

/**
 * Companion surface rendering the semantic facts in the active space's memory (populated by the analysis pipeline)
 * through the presentational {@link FactViewer}. Space-scoped via {@link useActiveSpace} — no container coupling.
 */
export const FactsCompanion = () => {
  const client = Hooks.useCapability(ClientCapabilities.Client);
  const space = ToolkitHooks.useActiveSpace();
  const facts = useFacts(client, space?.id);
  return <FactViewer.Root facts={facts} />;
};

FactsCompanion.displayName = 'FactsCompanion';
