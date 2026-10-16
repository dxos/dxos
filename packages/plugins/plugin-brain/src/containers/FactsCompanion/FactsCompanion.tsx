//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as ToolkitHooks from '@dxos/app-toolkit/Hooks';
import * as Agent from '@dxos/assistant/Agent';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { FactViewer } from '@dxos/react-ui-rdf';

import { useFacts } from './use-facts.ts';

/**
 * Companion surface rendering the facts the active space's agents hold in their brains (written by
 * the analysis pipeline) through the presentational {@link FactViewer}. Space-scoped via
 * {@link useActiveSpace} — no container coupling.
 */
export const FactsCompanion = () => {
  const space = ToolkitHooks.useActiveSpace();
  const agents = useQuery(space?.db, Filter.type(Agent.Agent));
  const facts = useFacts(agents, space?.db);
  return <FactViewer.Root facts={facts} />;
};

FactsCompanion.displayName = 'FactsCompanion';
