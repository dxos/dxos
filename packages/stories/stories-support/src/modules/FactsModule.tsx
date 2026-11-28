//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Fact } from '@dxos/echo-memory';

import { Support } from '../types/index.ts';
import { ListModule, type ListRow } from './ListModule.tsx';
import { useSupport } from './SupportContext.tsx';

const KIND_ICONS: Record<Support.FactKind, string> = {
  statement: 'ph--quotes--regular',
  question: 'ph--question--regular',
  request: 'ph--hand-pointing--regular',
};

const KIND_LABELS: Record<Support.FactKind, string> = {
  statement: 'Statement',
  question: 'Question',
  request: 'Request',
};

/** The facts in the space's memory, newest first: statements, questions and requests read from the messages. */
export const FactsModule = () => {
  const facts = useSupport()?.facts ?? [];
  const rows = useMemo<ListRow[]>(
    () =>
      [...facts]
        .sort((first, second) => second.recordedAt.localeCompare(first.recordedAt) || first.id.localeCompare(second.id))
        .map((fact) => {
          const kind = Support.kindOf(fact);
          return {
            id: fact.id,
            label: Fact.factText(fact),
            description: `${KIND_LABELS[kind]} from ${fact.attribution.agentLabel ?? fact.attribution.agent ?? 'unknown'}`,
            icon: KIND_ICONS[kind],
          };
        }),
    [facts],
  );
  return <ListModule title='Facts' rows={rows} empty='No facts yet.' testId='support.facts' />;
};
