//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { QUESTION_STATUSES } from '@dxos/deus/extension';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Status from '@dxos/react-ui/Status';
import * as Tag from '@dxos/react-ui/Tag';

import { CodeNamespace } from '../../namespace.ts';
import { parseQuestions } from '../SpecModel/index.ts';
import { QUESTION_STATUS_STYLE, SpecQuestionCard, type SpecQuestionCardProps } from './SpecQuestionCard.tsx';

export type QuestionPanelProps = Pick<SpecQuestionCardProps, 'onReveal' | 'onSelectDecision'> & {
  /** The spec text. */
  content: string;
};

/** Every `question` block of a spec as a card, open questions first, under a count per status. */
export const QuestionPanel = ({ content, onReveal, onSelectDecision }: QuestionPanelProps) => {
  const { t } = Hooks.useTranslation(CodeNamespace.key);
  const questions = useMemo(() => parseQuestions(content), [content]);

  if (questions.length === 0) {
    return (
      <Status.Empty icon='ph--question--regular' classNames='dx-fill' data-testid='question-panel.empty'>
        {t('question-panel.empty.label')}
      </Status.Empty>
    );
  }

  return (
    <Layout.Flex column classNames='h-full min-h-0' data-testid='question-panel'>
      <Layout.Flex wrap gap='xs' classNames='p-2 items-center text-xs'>
        {QUESTION_STATUSES.map((status) => {
          const count = questions.filter((question) => question.status === status).length;
          return (
            count > 0 && (
              <Tag.Tag
                key={status}
                hue={QUESTION_STATUS_STYLE[status].hue}
                data-testid={`question-panel.count.${status}`}
              >
                <Icon.Icon icon={QUESTION_STATUS_STYLE[status].icon} size='xs' />
                {count} {t(`spec-question.status.${status}.label`)}
              </Tag.Tag>
            )
          );
        })}
      </Layout.Flex>
      <ScrollArea.Root orientation='vertical' classNames='grow'>
        <ScrollArea.Viewport classNames='p-2'>
          <Layout.Flex column gap='sm'>
            {questions.map((question) => (
              <SpecQuestionCard
                key={question.id}
                question={question}
                onReveal={onReveal}
                onSelectDecision={onSelectDecision}
              />
            ))}
          </Layout.Flex>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Layout.Flex>
  );
};
