//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as Collapsible from '@dxos/react-ui/Collapsible';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Tag from '@dxos/react-ui/Tag';

import { ProjectsNamespace } from '../../namespace.ts';
import { ActorAvatar, type Citation, type DecisionModel } from '../DecisionModel/index.ts';

/** Keeps a click on an action inside a clickable card from also opening the card. */
const stopPropagation = (event: MouseEvent) => event.stopPropagation();

export type ApproveButtonProps = {
  /** The decisions the click approves. */
  ids: readonly string[];
  onApprove: (ids: readonly string[]) => void;
  /** Labelled with the count rather than the single id. */
  counted?: boolean;
  /** `valence` inside a Banner, so it takes the banner's colours. */
  variant?: Button.Variant;
};

/** Approves decisions; its label carries how many, so nothing beside it needs to. */
export const ApproveButton = ({ ids, onApprove, counted = true, variant }: ApproveButtonProps) => {
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
  return (
    <Button.Root
      variant={variant}
      icon='ph--seal-check--regular'
      label={
        counted ? t('decision.approve-count.label', { count: ids.length }) : t('decision.approve.label', { id: ids[0] })
      }
      onClick={(event) => {
        stopPropagation(event);
        onApprove(ids);
      }}
      data-testid='decision.approve'
      data-ids={ids.join(' ')}
    />
  );
};

const CitationTag = ({ citation: { id, kind, part } }: { citation: Citation }) => {
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
  return kind === 'replaces' ? (
    <Tag.Tag hue='error'>
      {part ? t('decision.replaces-part.label', { id, part }) : t('decision.replaces.label', { id })}
    </Tag.Tag>
  ) : (
    <Tag.Tag>{t(`decision.${kind}.label`, { id })}</Tag.Tag>
  );
};

type DecisionEntryProps = { decision: DecisionModel; onApprove?: ApproveButtonProps['onApprove'] };

/** `onApprove` is set only for a decision its card may approve. */
const DecisionEntry = ({ decision, onApprove }: DecisionEntryProps) => {
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
  const { entry, actor, handle, supersededBy, replacedInPart, approvedBy, cites } = decision;
  const reason = actor === 'user' ? (entry.quote ?? entry.why) : entry.why;
  const shownCitations = cites.filter(({ kind }) => kind !== 'approves');
  return (
    <Card.Section data-testid='decision-card.decision' data-decision={entry.id}>
      <Card.Row
        leading={<ActorAvatar actor={actor} handle={handle} />}
        trailing={
          <Layout.Flex align='center' gap='xs'>
            {onApprove && <ApproveButton ids={[entry.id]} onApprove={onApprove} counted={false} />}
            <Tag.Tag classNames='font-mono'>{entry.id}</Tag.Tag>
          </Layout.Flex>
        }
      >
        <Card.Text truncate variant='muted'>
          {[handle ?? t('changelog-graph.unknown-actor.label'), entry.date].filter(Boolean).join(' · ')}
        </Card.Text>
      </Card.Row>
      {(shownCitations.length > 0 || supersededBy || replacedInPart.length > 0 || approvedBy.length > 0) && (
        <Layout.Flex wrap gap='xs'>
          {shownCitations.map((citation) => (
            <CitationTag key={citation.id} citation={citation} />
          ))}
          {supersededBy && (
            <Tag.Tag hue='error'>{t('changelog-graph.superseded-by.label', { id: supersededBy })}</Tag.Tag>
          )}
          {replacedInPart.map(({ id, part }) => (
            <Tag.Tag key={id} hue='warning'>
              {t('decision.replaced-in-part.label', { id, part })}
            </Tag.Tag>
          ))}
          {approvedBy.length > 0 && (
            <Tag.Tag hue='success'>{t('changelog-graph.approved-in.label', { ids: approvedBy.join(', ') })}</Tag.Tag>
          )}
        </Layout.Flex>
      )}
      <Card.Text classNames={supersededBy && 'line-through'}>{entry.title}</Card.Text>
      {reason && (
        <Card.Text variant='muted' classNames={entry.quote && actor === 'user' && 'italic'}>
          {reason}
        </Card.Text>
      )}
      {entry.rejected.length > 0 && (
        <Collapsible.Root>
          <Collapsible.Trigger data-testid='decision-card.rejected'>
            {t('decision.rejected.label', { count: entry.rejected.length })}
          </Collapsible.Trigger>
          <Collapsible.Content>
            <ul className='list-disc ps-6'>
              {entry.rejected.map((option) => (
                <li key={option}>
                  <Card.Text variant='muted'>{option}</Card.Text>
                </li>
              ))}
            </ul>
          </Collapsible.Content>
        </Collapsible.Root>
      )}
    </Card.Section>
  );
};

export type DecisionCardProps = {
  /** A decision and any that fill it in, which read as one step. */
  decisions: readonly DecisionModel[];
  selected?: string;
  /** The decisions the card offers to approve, from `unapprovedIds`. */
  approvable?: readonly string[];
  /** Approves decisions; without it the card has no approve actions. */
  onApprove?: ApproveButtonProps['onApprove'];
};

/** One step of a thread: who decided what and why, how it relates to what it cites, and what it rejected. */
export const DecisionCard = ({ decisions, selected, approvable = [], onApprove }: DecisionCardProps) => (
  <Card.Root
    selected={decisions.some(({ id }) => id === selected)}
    classNames={decisions.every(({ supersededBy }) => supersededBy) && 'opacity-60'}
    data-testid='decision-card'
  >
    {decisions.map((decision) => (
      <DecisionEntry
        key={decision.id}
        decision={decision}
        onApprove={approvable.includes(decision.id) ? onApprove : undefined}
      />
    ))}
  </Card.Root>
);
