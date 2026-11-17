//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type VerdictStatus } from '@dxos/deus/review';
import * as Icon from '@dxos/react-ui/Icon';
import { mx } from '@dxos/ui-theme';

import { type ChangeKind, type DefinitionGrouping, type DefinitionModel, STATUS_STYLE } from '../SpecModel/index.ts';
import { type CardFact } from './definition-facts.ts';

/** What every Definitions view draws from: the definitions, how they group, and how review and diff mark them. */
export type DefinitionViewModel = {
  byId: ReadonlyMap<string, DefinitionModel>;
  grouping: DefinitionGrouping;
  statusOf: (id: string) => VerdictStatus | undefined;
  changeOf: (id: string) => ChangeKind | undefined;
  /** What its kind writes about it that a card shows, such as a feature's status. */
  factsOf: (id: string) => CardFact[];
};

/** How a changed chip is framed in diff mode: green for new, amber for changed, red and dashed for removed. */
export const CHANGE_FRAME: Record<ChangeKind, string> = {
  added: 'border-2 border-success-text',
  changed: 'border-2 border-warning-text',
  removed: 'border-2 border-dashed border-error-text opacity-60',
};

export type DefinitionChipProps = {
  view: DefinitionViewModel;
  id: string;
  /** How many groups name it, shown when more than one. */
  count?: number;
  /** Lit because the selection names it. */
  lit?: boolean;
  onOpen?: (id: string) => void;
};

/** One definition as a chip: its kind's icon, its id, how many groups share it, its verdict and its change. */
export const DefinitionChip = ({ view, id, count = 0, lit, onOpen }: DefinitionChipProps) => {
  const definition = view.byId.get(id);
  if (!definition) {
    return null;
  }
  const status = definition.external ? undefined : view.statusOf(id);
  const change = view.changeOf(id);
  return (
    <button
      type='button'
      className={mx(
        'inline-flex items-center gap-1 min-w-0 max-w-full h-6 px-2 rounded-sm border text-xs font-mono dx-focus-ring',
        lit ? 'border-accent-text bg-current-surface text-accent-text' : 'border-separator bg-input-surface',
        definition.external && 'border-dashed',
        change && CHANGE_FRAME[change],
      )}
      title={definition.title}
      onClick={() => onOpen?.(id)}
      data-node={id}
      data-testid='definition-graph.chip'
      data-definition={id}
      data-kind={definition.kind}
      data-lit={lit ? '' : undefined}
      data-change={change}
      data-status={status}
    >
      <Icon.Icon icon={definition.style.icon} size='xs' classNames='shrink-0' />
      <span className='truncate'>{definition.external?.fragment ?? id}</span>
      {count > 1 && <span className='shrink-0 text-description'>×{count}</span>}
      {status && (
        <Icon.Icon icon={STATUS_STYLE[status].icon} size='xs' classNames={mx('shrink-0', STATUS_STYLE[status].text)} />
      )}
    </button>
  );
};
