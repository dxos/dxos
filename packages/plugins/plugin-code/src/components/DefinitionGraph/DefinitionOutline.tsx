//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useLayoutEffect, useMemo, useRef, useState } from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import { mx } from '@dxos/ui-theme';

import { CodeNamespace } from '../../namespace.ts';
import { type DefinitionCluster, UNSHARED_CLUSTER_ID, kindStyle } from '../SpecModel/index.ts';
import { type DefinitionViewModel } from './DefinitionChip.tsx';

const clusterTitle = (t: (key: string, options?: object) => string, cluster: DefinitionCluster): string =>
  cluster.hub === undefined
    ? t('definition-map.cluster.unshared.label')
    : t('definition-map.cluster.label', { hub: cluster.hub });

type RowProps = {
  depth: number;
  /** Shown as a caret; absent for a leaf. */
  open?: boolean;
  onClick: () => void;
  /** Lit because the hovered block is named here. */
  marked?: boolean;
  children: ReactNode;
  end?: ReactNode;
  testId: string;
  onHover?: (hovered: boolean) => void;
};

const Row = ({ depth, open, onClick, marked, children, end, testId, onHover }: RowProps) => (
  <button
    type='button'
    className={mx(
      'flex items-center gap-2 w-full h-7 pe-2 rounded-sm text-sm text-start dx-focus-ring hover:bg-hover-surface',
      marked && 'bg-current-surface',
    )}
    style={{ paddingInlineStart: `${0.5 + depth * 1}rem` }}
    aria-expanded={open}
    onClick={onClick}
    onPointerEnter={() => onHover?.(true)}
    onPointerLeave={() => onHover?.(false)}
    onFocus={() => onHover?.(true)}
    onBlur={() => onHover?.(false)}
    data-testid={testId}
    data-marked={marked ? '' : undefined}
  >
    {open === undefined ? (
      <span className='w-3 shrink-0' />
    ) : (
      <Icon.Icon icon={open ? 'ph--caret-down--regular' : 'ph--caret-right--regular'} size='xs' classNames='shrink-0' />
    )}
    <span className='flex items-center gap-2 grow min-w-0 truncate'>{children}</span>
    {end && <span className='shrink-0 text-xs text-description'>{end}</span>}
  </button>
);

/** Where the bracket in the gutter runs, and the rows it ticks. */
type Bracket = { top: number; bottom: number; ticks: number[] };

export type DefinitionOutlineProps = {
  view: DefinitionViewModel;
  /** Opens a block's related view. */
  onOpen: (id: string) => void;
};

/**
 * The whole spec as a tree, for a narrow panel: clusters, their groups, and what each group names, with how many
 * groups share each block. Hovering a block draws a bracket in the gutter that ties together every group naming it.
 */
export const DefinitionOutline = ({ view, onOpen }: DefinitionOutlineProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const { grouping, byId } = view;
  const groupById = useMemo(() => new Map(grouping.groups.map((group) => [group.id, group])), [grouping]);
  const [closedClusters, setClosedClusters] = useState<ReadonlySet<string>>(new Set());
  const [openGroups, setOpenGroups] = useState<ReadonlySet<string>>(new Set());
  const [hovered, setHovered] = useState<string>();
  const naming = useMemo(() => new Set(hovered ? (grouping.memberOf.get(hovered) ?? []) : []), [grouping, hovered]);
  const toggle = (set: ReadonlySet<string>, id: string) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  };

  const container = useRef<HTMLDivElement>(null);
  const [bracket, setBracket] = useState<Bracket>();
  useLayoutEffect(() => {
    const root = container.current;
    const rows = root ? [...root.querySelectorAll<HTMLElement>('[data-marked]')] : [];
    if (!root || rows.length < 2) {
      setBracket(undefined);
      return;
    }
    const origin = root.getBoundingClientRect().top;
    const ticks = rows.map((row) => {
      const { top, bottom } = row.getBoundingClientRect();
      return (top + bottom) / 2 - origin;
    });
    setBracket({ top: ticks[0], bottom: ticks[ticks.length - 1], ticks });
  }, [hovered, openGroups, closedClusters]);

  const memberRow = (id: string, depth: number, key: string) => {
    const definition = byId.get(id);
    const count = grouping.memberOf.get(id)?.length ?? 0;
    return (
      definition && (
        <Row
          key={key}
          depth={depth}
          onClick={() => onOpen(id)}
          marked={id === hovered}
          onHover={(on) => setHovered(on ? id : undefined)}
          end={count > 1 ? `×${count}` : undefined}
          testId='definition-outline.definition'
        >
          <Icon.Icon icon={kindStyle(definition.kind).icon} size='xs' classNames='shrink-0' />
          <span className='truncate font-mono'>{definition.external?.fragment ?? id}</span>
        </Row>
      )
    );
  };

  return (
    <div ref={container} className='relative pe-4' data-testid='definition-outline'>
      {grouping.clusters.map((cluster) => {
        const open = !closedClusters.has(cluster.id);
        return (
          <div key={cluster.id} data-testid='definition-outline.cluster' data-cluster={cluster.id}>
            <Row
              depth={0}
              open={open}
              onClick={() => setClosedClusters((closed) => toggle(closed, cluster.id))}
              end={t('definition-map.groups.label', { count: cluster.groups.length })}
              testId='definition-outline.cluster-toggle'
            >
              <span className={mx('truncate font-medium', cluster.id !== UNSHARED_CLUSTER_ID && 'font-mono')}>
                {clusterTitle(t, cluster)}
              </span>
            </Row>
            {open &&
              cluster.groups.map((id) => {
                const group = groupById.get(id);
                if (!group) {
                  return null;
                }
                const groupOpen = openGroups.has(id);
                const members = [...group.owned, ...group.shared, ...group.context];
                return (
                  <div key={id}>
                    <Row
                      depth={1}
                      open={groupOpen}
                      onClick={() => setOpenGroups((opened) => toggle(opened, id))}
                      marked={naming.has(id)}
                      end={members.length}
                      testId='definition-outline.group'
                    >
                      <span className='shrink-0 text-xs text-description font-mono'>{id}</span>
                      <span className='truncate'>{group.anchor.title ?? id}</span>
                      {group.buildsOn.length > 0 && (
                        <span className='shrink-0 text-xs text-description'>
                          {t('definition-outline.builds-on.label', { ids: group.buildsOn.join(', ') })}
                        </span>
                      )}
                    </Row>
                    {groupOpen && members.map((member) => memberRow(member, 2, `${id}:${member}`))}
                  </div>
                );
              })}
          </div>
        );
      })}
      {grouping.ungrouped.length > 0 && (
        <div data-testid='definition-outline.ungrouped'>
          <Row
            depth={0}
            open={!closedClusters.has('ungrouped')}
            onClick={() => setClosedClusters((closed) => toggle(closed, 'ungrouped'))}
            end={grouping.ungrouped.length}
            testId='definition-outline.cluster-toggle'
          >
            <span className='truncate font-medium'>{t('definition-map.ungrouped.label')}</span>
          </Row>
          {!closedClusters.has('ungrouped') && grouping.ungrouped.map((id) => memberRow(id, 1, `ungrouped:${id}`))}
        </div>
      )}
      {bracket && (
        <div
          className='absolute inset-y-0 end-0 w-3 pointer-events-none'
          aria-hidden
          data-testid='definition-outline.bracket'
        >
          <div
            className='absolute end-1 w-0.5 bg-accent-text'
            style={{ top: bracket.top, height: bracket.bottom - bracket.top }}
          />
          {bracket.ticks.map((tick) => (
            <div key={tick} className='absolute end-1 w-2 h-0.5 bg-accent-text' style={{ top: tick - 1 }} />
          ))}
        </div>
      )}
    </div>
  );
};
