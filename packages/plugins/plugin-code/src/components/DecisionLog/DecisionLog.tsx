//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Tag from '@dxos/react-ui/Tag';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import {
  ACTOR_STYLE,
  ActorAvatar,
  type DeciderGroup,
  type DecisionModel,
  buildChangelogGraph,
  groupByDecider,
} from '../ChangelogGraph/index.ts';

const DecisionRow = ({ decision, selected }: { decision: DecisionModel; selected: boolean }) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { entry, actor, principal, supersededBy, approvedBy } = decision;
  const reason = actor === 'user' ? (entry.quote ?? entry.why) : entry.why;
  return (
    <li
      className={mx(
        'grid grid-cols-[4rem_minmax(0,1fr)] gap-x-3 px-3 py-2 rounded-sm',
        selected && 'bg-selected-surface',
        supersededBy && 'opacity-60',
      )}
      data-testid='decision-log.decision'
      data-decision={entry.id}
      data-selected={selected ? '' : undefined}
    >
      <div className='flex flex-col'>
        <span className='font-mono text-sm'>{entry.id}</span>
        {entry.date && <span className='text-xs text-description'>{entry.date}</span>}
      </div>
      <div className='flex flex-col gap-1 min-w-0'>
        <span className={mx(supersededBy && 'line-through')}>{entry.title}</span>
        {reason && (
          <span className={mx('text-sm text-description line-clamp-2', entry.quote && actor === 'user' && 'italic')}>
            {reason}
          </span>
        )}
        {(principal || supersededBy || approvedBy.length > 0 || entry.affects.length > 0) && (
          <Layout.Flex wrap gap='xs'>
            {principal && (
              <Tag.Tag hue={ACTOR_STYLE.user.hue}>
                <Icon.Icon icon='ph--user-focus--regular' size='xs' />
                {t('changelog-graph.for.label', { principal })}
              </Tag.Tag>
            )}
            {supersededBy && (
              <Tag.Tag hue='error'>{t('changelog-graph.superseded-by.label', { id: supersededBy })}</Tag.Tag>
            )}
            {approvedBy.length > 0 && (
              <Tag.Tag hue='success'>{t('changelog-graph.approved-in.label', { ids: approvedBy.join(', ') })}</Tag.Tag>
            )}
            {entry.affects.map((block) => (
              <Tag.Tag key={block} classNames='font-mono'>
                {block}
              </Tag.Tag>
            ))}
          </Layout.Flex>
        )}
      </div>
    </li>
  );
};

const DeciderSection = ({ group, selected }: { group: DeciderGroup; selected?: string }) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const style = group.actor ? ACTOR_STYLE[group.actor] : undefined;
  return (
    <section
      className={mx('rounded-md bg-card-surface', style?.frame ?? 'border border-separator')}
      data-testid='decision-log.decider'
      data-actor={group.actor}
      data-handle={group.handle}
    >
      <header className='flex items-center gap-2 px-3 py-2 border-b border-separator'>
        <ActorAvatar actor={group.actor} handle={group.handle} />
        <span className='font-medium truncate'>{group.handle ?? t('changelog-graph.unknown-actor.label')}</span>
        {style && group.actor && (
          <Tag.Tag hue={style.hue}>
            <Icon.Icon icon={style.icon} size='xs' />
            {t(`changelog-graph.actor.${group.actor}.label`)}
          </Tag.Tag>
        )}
        <span className='grow' />
        <Tag.Tag>{t('decision-log.count.label', { count: group.decisions.length })}</Tag.Tag>
      </header>
      <ul className='flex flex-col'>
        {group.decisions.map((decision) => (
          <DecisionRow key={decision.id} decision={decision} selected={decision.id === selected} />
        ))}
      </ul>
    </section>
  );
};

export type DecisionLogProps = {
  /** The text of a `.mdl` spec; only its `## Changelog` is listed. */
  content: string;
  /** A decision id whose row is highlighted. */
  selected?: string;
};

/**
 * A spec's `## Changelog` as a log grouped by decider: one section per person, then per agent at the bottom,
 * each listing that decider's decisions in the order they were made.
 */
export const DecisionLog = ({ content, selected }: DecisionLogProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const groups = useMemo(
    () =>
      groupByDecider(
        buildChangelogGraph(content).nodes.filter((node): node is DecisionModel => node.kind === 'decision'),
      ),
    [content],
  );

  if (groups.length === 0) {
    return (
      <Layout.Flex classNames='dx-fill items-center justify-center text-description' data-testid='decision-log.empty'>
        {t('decision-log.empty.message')}
      </Layout.Flex>
    );
  }

  return (
    <ScrollArea.Root orientation='vertical' data-testid='decision-log'>
      <ScrollArea.Viewport>
        <div className='flex flex-col gap-4 p-4'>
          {groups.map((group) => (
            <DeciderSection key={`${group.actor}:${group.handle}`} group={group} selected={selected} />
          ))}
        </div>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};
