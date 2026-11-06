//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useRef } from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Tag from '@dxos/react-ui/Tag';
import { mx } from '@dxos/ui-theme';

import { CodeNamespace } from '../../namespace.ts';
import { type DefinitionCluster, type DefinitionGroup, UNSHARED_CLUSTER_ID, kindStyle } from '../SpecModel/index.ts';
import { type Connector, ConnectorLayer } from './Connectors.tsx';
import { CHANGE_FRAME, DefinitionChip, type DefinitionViewModel } from './DefinitionChip.tsx';

const clusterTitle = (t: (key: string, options?: object) => string, cluster?: DefinitionCluster): string =>
  cluster?.hub === undefined
    ? t('definition-map.cluster.unshared.label')
    : t('definition-map.cluster.label', { hub: cluster.hub });

type GroupFrameProps = {
  view: DefinitionViewModel;
  group: DefinitionGroup;
  selected: boolean;
  /** The selected group, whose blocks are lit. */
  lit: ReadonlySet<string>;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
};

/** One anchor as a frame holding what only it names; selecting it lights what it shares. */
const GroupFrame = ({ view, group, selected, lit, onSelect, onOpen }: GroupFrameProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const { anchor } = group;
  const own = [...group.owned, ...group.context];
  const change = view.changeOf(group.id);
  return (
    <div
      className={mx(
        'flex flex-col gap-2 p-2 rounded-md bg-base-surface border',
        selected ? 'border-2 border-accent-text' : 'border-separator',
        change && CHANGE_FRAME[change],
      )}
      data-node={group.id}
      data-testid='definition-map.group'
      data-group={group.id}
      data-selected={selected ? '' : undefined}
      data-change={change}
    >
      <button
        type='button'
        className='flex items-start gap-2 text-start rounded-sm dx-focus-ring'
        aria-pressed={selected}
        onClick={() => onSelect(group.id)}
        data-testid='definition-map.select'
      >
        <Icon.Icon icon={kindStyle(anchor.kind).icon} classNames='mt-0.5 shrink-0' />
        <span className='flex flex-col min-w-0'>
          {anchor.title && anchor.title !== anchor.id ? (
            <>
              <span className='text-xs text-description font-mono'>{anchor.id}</span>
              <span className='text-sm font-medium line-clamp-2'>{anchor.title}</span>
            </>
          ) : (
            <span className='text-sm font-medium font-mono truncate'>{anchor.id}</span>
          )}
        </span>
      </button>
      <div className='flex flex-wrap gap-1'>
        {anchor.requirements > 0 && (
          <Tag.Tag>{t('definition-graph.requirements.label', { count: anchor.requirements })}</Tag.Tag>
        )}
        {group.verifiedBy.length > 0 && (
          <Tag.Tag hue={kindStyle('scenario').hue}>
            {t('definition-map.verified-by.label', { count: group.verifiedBy.length })}
          </Tag.Tag>
        )}
        {group.shared.length > 0 && (
          <Tag.Tag>{t('definition-map.shares.label', { count: group.shared.length })}</Tag.Tag>
        )}
        {group.buildsOn.length > 0 && (
          <Tag.Tag data-testid='definition-map.builds-on'>
            {t('definition-outline.builds-on.label', { ids: group.buildsOn.join(', ') })}
          </Tag.Tag>
        )}
      </div>
      {own.length > 0 ? (
        <div className='flex flex-wrap gap-1'>
          {own.map((id) => (
            <DefinitionChip key={id} view={view} id={id} lit={lit.has(id)} onOpen={onOpen} />
          ))}
        </div>
      ) : (
        <span className='text-xs text-description'>{t('definition-map.no-owned.label')}</span>
      )}
    </div>
  );
};

export type DefinitionMapProps = {
  view: DefinitionViewModel;
  /** The group whose shared blocks are lit and drawn to. */
  selected?: string;
  onSelect: (id: string | undefined) => void;
  /** Opens a block's related view. */
  onOpen: (id: string) => void;
};

/**
 * The whole spec as clusters of groups. Each cluster is a band of frames, one per anchor, holding what only that
 * anchor names, over a strip of what its groups share. Selecting a group lights everything it names and draws arrows
 * only for it: to the groups it builds on, from the groups building on it, and to the shared blocks in its cluster.
 */
export const DefinitionMap = ({ view, selected, onSelect, onOpen }: DefinitionMapProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const container = useRef<HTMLDivElement>(null);
  const { grouping } = view;
  const groupById = useMemo(() => new Map(grouping.groups.map((group) => [group.id, group])), [grouping]);
  const clusterOf = useMemo(
    () => new Map(grouping.clusters.flatMap(({ id, groups }) => groups.map((group) => [group, id]))),
    [grouping],
  );
  const selectedGroup = selected ? groupById.get(selected) : undefined;
  const lit = useMemo(
    () => new Set(selectedGroup ? [...selectedGroup.owned, ...selectedGroup.shared, ...selectedGroup.context] : []),
    [selectedGroup],
  );
  const connectors = useMemo<Connector[]>(() => {
    if (!selectedGroup) {
      return [];
    }
    const buildsOn = grouping.groups.flatMap(({ id, buildsOn }) =>
      buildsOn
        .filter((target) => id === selected || target === selected)
        .map((target) => ({ id: `${id}->${target}`, from: id, to: target, accent: true })),
    );
    const home = selected ? clusterOf.get(selected) : undefined;
    const homeShared = new Set(grouping.clusters.find(({ id }) => id === home)?.shared);
    const shared = selectedGroup.shared
      .filter((id) => homeShared.has(id))
      .map((id) => ({ id: `${selectedGroup.id}->${id}`, from: selectedGroup.id, to: id, accent: true }));
    return [...buildsOn, ...shared];
  }, [grouping, selected, selectedGroup, clusterOf]);
  const linksOf = (cluster: string) =>
    grouping.links.filter(({ from }) => from === cluster).sort((a, b) => b.count - a.count);
  const clusterById = new Map(grouping.clusters.map((cluster) => [cluster.id, cluster]));

  return (
    <div ref={container} className='relative flex flex-col gap-4' data-testid='definition-map'>
      {grouping.clusters.map((cluster) => (
        <section
          key={cluster.id}
          className='flex flex-col gap-3 p-3 rounded-lg bg-group-surface'
          data-testid='definition-map.cluster'
          data-cluster={cluster.id}
        >
          <div className='flex flex-wrap items-center gap-2'>
            <span className={mx('text-sm font-medium', cluster.id !== UNSHARED_CLUSTER_ID && 'font-mono')}>
              {clusterTitle(t, cluster)}
            </span>
            <span className='text-xs text-description'>
              {t('definition-map.groups.label', { count: cluster.groups.length })}
            </span>
            {linksOf(cluster.id).map(({ to, count }) => (
              <Tag.Tag key={to} data-testid='definition-map.link'>
                <Icon.Icon icon='ph--arrow-right--regular' size='xs' />
                {t('definition-map.link.label', { cluster: clusterTitle(t, clusterById.get(to)), count })}
              </Tag.Tag>
            ))}
          </div>
          <div className='grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] items-start gap-x-8 gap-y-6'>
            {cluster.groups.map((id) => {
              const group = groupById.get(id);
              return (
                group && (
                  <GroupFrame
                    key={id}
                    view={view}
                    group={group}
                    selected={id === selected}
                    lit={lit}
                    onSelect={(id) => onSelect(id === selected ? undefined : id)}
                    onOpen={onOpen}
                  />
                )
              );
            })}
          </div>
          {cluster.shared.length > 0 && (
            <div className='flex flex-col gap-1 pt-3' data-testid='definition-map.shared'>
              <span className='text-xs text-description'>{t('definition-map.shared.label')}</span>
              <div className='flex flex-wrap gap-1'>
                {cluster.shared.map((id) => (
                  <DefinitionChip
                    key={id}
                    view={view}
                    id={id}
                    count={grouping.memberOf.get(id)?.length}
                    lit={lit.has(id)}
                    onOpen={onOpen}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      ))}
      {grouping.ungrouped.length > 0 && (
        <section
          className='flex flex-col gap-2 p-3 rounded-lg border border-dashed border-separator'
          data-testid='definition-map.ungrouped'
        >
          <span className='text-sm font-medium'>{t('definition-map.ungrouped.label')}</span>
          <div className='flex flex-wrap gap-1'>
            {grouping.ungrouped.map((id) => (
              <DefinitionChip key={id} view={view} id={id} onOpen={onOpen} />
            ))}
          </div>
        </section>
      )}
      <ConnectorLayer container={container} connectors={connectors} />
    </div>
  );
};
