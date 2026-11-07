//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as Breadcrumb from '@dxos/react-ui/Breadcrumb';
import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Status from '@dxos/react-ui/Status';
import * as Tag from '@dxos/react-ui/Tag';

import { ProjectsNamespace } from '../../namespace.ts';
import { type ApproveButtonProps, DecisionCard, QuestionCard, ledgerDecisions } from '../DecisionLedger/index.ts';
import { ActorAvatar, type DecisionModel, buildChangelogGraph, buildQuestions } from '../DecisionModel/index.ts';
import { cursorDecisions, focusAt } from './cursor-decisions.ts';

export type DecisionCursorProps = {
  /** The text of a `.mdl` spec. */
  content: string;
  /** The offset in `content` of the editor's cursor. */
  cursor?: number;
  /** Records a person's approval of agent decisions; without it there are no approve actions. */
  onApprove?: ApproveButtonProps['onApprove'];
  /** Records an answer to an open question as a decision; without it questions are read-only. */
  onAnswer?: (question: string, answer: string) => void;
  /** Opens a decision's thread in the ledger. */
  onOpenLedger?: (decision: string) => void;
};

/**
 * The decisions on the block at the editor's cursor, following the cursor as it moves: those that hold on the item it
 * is on, each with what fills it in, then those on the enclosing block or on the block's items, and its open questions.
 */
export const DecisionCursor = ({ content, cursor, onApprove, onAnswer, onOpenLedger }: DecisionCursorProps) => {
  const { t } = Hooks.useTranslation(ProjectsNamespace.key);
  const decisions = useMemo(() => ledgerDecisions(buildChangelogGraph(content)), [content]);
  const questions = useMemo(() => buildQuestions(content), [content]);
  const focus = useMemo(() => (cursor === undefined ? undefined : focusAt(content, cursor)), [content, cursor]);
  const found = useMemo(() => focus && cursorDecisions(focus, decisions, questions), [focus, decisions, questions]);

  if (!focus || !found) {
    return (
      <Status.Empty classNames='dx-fill' data-testid='decision-cursor.empty'>
        {t('decision-cursor.empty.message')}
      </Status.Empty>
    );
  }

  const target = focus.item ?? focus.id;
  const own = decisions.find(({ id }) => id === focus.id);
  const fillsIn = (lead: DecisionModel) =>
    decisions.filter(({ cites }) => cites.some(({ id, kind }) => kind === 'fills-in' && id === lead.id));
  // A decision that fills in one shown here reads inside that one's card, not again on its own.
  const filling = new Set(found.here.flatMap((decision) => fillsIn(decision).map(({ id }) => id)));
  const steps = found.here.filter(({ id }) => !filling.has(id)).map((lead) => [lead, ...fillsIn(lead)]);
  const empty =
    !own &&
    steps.length === 0 &&
    found.enclosing.length === 0 &&
    found.within.length === 0 &&
    found.questions.length === 0;

  return (
    <ScrollArea.Root orientation='vertical' classNames='dx-fill' data-testid='decision-cursor' data-focus={target}>
      <ScrollArea.Viewport>
        <Layout.Flex column gap='md' classNames='p-2'>
          <Breadcrumb.Root aria-label={t('decision-cursor.trail.label')}>
            <Breadcrumb.List>
              {focus.item && (
                <>
                  <Breadcrumb.Item>
                    <span className='font-mono'>{focus.id}</span>
                  </Breadcrumb.Item>
                  <Breadcrumb.Separator />
                </>
              )}
              <Breadcrumb.Item>
                <Breadcrumb.Current classNames='font-mono'>{`${focus.item ? '' : `${focus.type} `}${target}`}</Breadcrumb.Current>
              </Breadcrumb.Item>
            </Breadcrumb.List>
          </Breadcrumb.Root>

          {own ? (
            <>
              <DecisionCard decisions={[own]} onApprove={onApprove} />
              {onOpenLedger && (
                <Button.Root
                  icon='ph--list-bullets--regular'
                  label={t('decision-cursor.open-ledger.label')}
                  onClick={() => onOpenLedger(own.id)}
                  data-testid='decision-cursor.open-ledger'
                />
              )}
            </>
          ) : (
            <>
              {empty && (
                <Status.Empty data-testid='decision-cursor.none'>
                  {t('decision-cursor.none.message', { id: target })}
                </Status.Empty>
              )}
              {steps.length > 0 && (
                <Layout.Flex column gap='sm' data-testid='decision-cursor.here'>
                  <Card.Text variant='muted'>{t('decision-cursor.here.label', { count: steps.length })}</Card.Text>
                  {steps.map((step) => (
                    <DecisionCard key={step[0].id} decisions={step} onApprove={onApprove} />
                  ))}
                </Layout.Flex>
              )}
              {found.enclosing.length > 0 && (
                <RowList
                  title={t('decision-cursor.enclosing.label', { id: focus.id })}
                  decisions={found.enclosing}
                  onOpen={onOpenLedger}
                  testId='decision-cursor.enclosing'
                />
              )}
              {found.within.length > 0 && (
                <RowList
                  title={t('decision-cursor.within.label')}
                  decisions={found.within}
                  onOpen={onOpenLedger}
                  testId='decision-cursor.within'
                  showAffects
                />
              )}
              {found.questions.map((question) => (
                <QuestionCard key={question.id} question={question} selected={false} onAnswer={onAnswer} />
              ))}
              {found.replaced.length > 0 && onOpenLedger && (
                <Button.Root
                  variant='ghost'
                  icon='ph--clock-counter-clockwise--regular'
                  label={t('decision-cursor.replaced.label', { count: found.replaced.length })}
                  onClick={() => onOpenLedger(found.replaced[0].id)}
                  data-testid='decision-cursor.replaced'
                />
              )}
            </>
          )}
        </Layout.Flex>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

type RowListProps = {
  title: string;
  decisions: DecisionModel[];
  onOpen?: (decision: string) => void;
  testId: string;
  /** Tags each row with the blocks it affects. */
  showAffects?: boolean;
};

/** Decisions on a related block, a row each, that open their thread in the ledger. */
const RowList = ({ title, decisions, onOpen, testId, showAffects = false }: RowListProps) => (
  <Card.Root data-testid={testId}>
    <Card.Section title={title}>
      {decisions.map((decision) => (
        <Card.Row
          key={decision.id}
          leading={<ActorAvatar actor={decision.actor} handle={decision.handle} />}
          trailing={
            <Layout.Flex gap='xs'>
              {showAffects &&
                decision.entry.affects.map((id) => (
                  <Tag.Tag key={id} classNames='font-mono'>
                    {id}
                  </Tag.Tag>
                ))}
              <Tag.Tag classNames='font-mono'>{decision.id}</Tag.Tag>
            </Layout.Flex>
          }
          onClick={onOpen && (() => onOpen(decision.id))}
          data-decision={decision.id}
        >
          <Card.Text truncate>{decision.entry.title}</Card.Text>
        </Card.Row>
      ))}
    </Card.Section>
  </Card.Root>
);
