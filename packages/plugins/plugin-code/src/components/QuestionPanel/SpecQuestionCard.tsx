//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type QuestionStatus } from '@dxos/deus/extension';
import { TaskQuestion } from '@dxos/react-ui-task';
import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Tag from '@dxos/react-ui/Tag';

import { CodeNamespace } from '../../namespace.ts';
import { type SpecQuestion, toQuestionThread } from '../SpecModel/index.ts';

export const QUESTION_STATUS_STYLE: Record<QuestionStatus, { icon: string; hue: Tag.TagHue }> = {
  open: { icon: 'ph--question--regular', hue: 'warning' },
  answered: { icon: 'ph--check-circle--regular', hue: 'success' },
  moot: { icon: 'ph--minus-circle--regular', hue: 'neutral' },
};

export type SpecQuestionCardProps = {
  question: SpecQuestion;
  /** Shows the question block in the spec. */
  onReveal?: (id: string) => void;
  /** Shows a decision that records the answer, in the decision graph. */
  onSelectDecision?: (id: string) => void;
};

/**
 * One `question` block of a spec as a card: the agent-question UI (read-only, since the viewer cannot write the
 * answer back to the spec file), then who must answer, the status, and the decisions that record the answer.
 */
export const SpecQuestionCard = ({ question, onReveal, onSelectDecision }: SpecQuestionCardProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const { id, status, to, decisions, options } = question;
  const thread = useMemo(() => toQuestionThread(question), [question]);
  const style = QUESTION_STATUS_STYLE[status];
  return (
    <Card.Root grid data-testid='spec-question-card' data-question={id} data-status={status}>
      <Card.Header>
        <Layout.Block rail='start'>
          <Icon.Icon icon={style.icon} />
        </Layout.Block>
        <Card.Title truncate classNames='font-mono'>
          {id}
        </Card.Title>
        {onReveal && (
          <Layout.Block rail='end'>
            <Button.Root
              variant='ghost'
              icon='ph--crosshair--regular'
              iconOnly
              label={t('spec-question-card.reveal.label')}
              data-testid='spec-question-card.reveal'
              onClick={() => onReveal(id)}
            />
          </Layout.Block>
        )}
      </Card.Header>
      <Card.Body>
        {/* In the body's content track, not a Card.Row, whose content is one truncated line. */}
        <TaskQuestion thread={thread} />
        {/* TaskQuestion shows options only as answer buttons, which a read-only card has none of. */}
        {!thread.answer && options.length > 0 && (
          <ol className='list-decimal ps-5 text-sm text-description' data-testid='spec-question-card.options'>
            {options.map((option) => (
              <li key={option}>{option}</li>
            ))}
          </ol>
        )}
        <Card.Row>
          <Layout.Flex wrap gap='xs' classNames='items-center'>
            <Tag.Tag hue={style.hue} data-testid='spec-question-card.status'>
              {t(`spec-question.status.${status}.label`)}
            </Tag.Tag>
            {to && (
              <Tag.Tag title={t('spec-question-card.to.label')} data-testid='spec-question-card.to'>
                <Icon.Icon icon='ph--user--regular' size='xs' />
                {to.replace(/^user:/, '')}
              </Tag.Tag>
            )}
            {decisions.map((decision) =>
              onSelectDecision ? (
                <Button.Root
                  key={decision}
                  compact
                  hue='amber'
                  icon='ph--graph--regular'
                  label={decision}
                  data-testid='spec-question-card.decision'
                  onClick={() => onSelectDecision(decision)}
                />
              ) : (
                <Tag.Tag key={decision} hue='amber' data-testid='spec-question-card.decision'>
                  {decision}
                </Tag.Tag>
              ),
            )}
          </Layout.Flex>
        </Card.Row>
      </Card.Body>
    </Card.Root>
  );
};

SpecQuestionCard.displayName = 'SpecQuestionCard';
