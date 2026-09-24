//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { log } from '@dxos/log';
import { Card, useTranslation } from '@dxos/react-ui';
import { TaskQuestion } from '@dxos/react-ui-task';
import { Task } from '@dxos/types';

import { meta } from '#meta';
import { AssistantOperation } from '#types';

const QUESTION_CARD_NAME = 'QuestionCard';

export type QuestionCardProps = {
  task: Task.Task;
  /** Id of the question's entry in the task's history. */
  questionId: string;
};

/**
 * The card body for a question in a task's history, answered through `AnswerQuestion` so the
 * conversation that asked is resumed.
 *
 * The body ONLY — the host draws `Card.Root` and the header.
 */
export const QuestionCard = ({ task, questionId }: QuestionCardProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  // Snapshot rather than the object: the card must repaint when the answer lands, including when
  // it lands from another surface showing the same question — the task's own row, say.
  const [snapshot] = useObject(task);
  const [busy, setBusy] = useState(false);
  // What the write actually did, so the card can say when the answer landed but the agent did not
  // wake — a checkmark over a task that stays blocked forever is the one outcome with no signal.
  const [failed, setFailed] = useState(false);
  const [stranded, setStranded] = useState(false);

  const handleAnswer = useCallback(
    async (answer: string) => {
      // The operation's `Database.Service` is space-affinity, so the invocation has to name the
      // space: without it the process spawns with no database and the answer is silently lost.
      const spaceId = Obj.getDatabase(task)?.spaceId;
      if (busy || !spaceId) {
        return;
      }
      setBusy(true);
      setFailed(false);
      try {
        const result = await invokePromise(
          AssistantOperation.AnswerQuestion,
          { task, question: questionId, answer },
          { spaceId },
        );
        // Rejection is not the only failure: the operation reports a refused write and an
        // unreachable agent in its result, and dropping those leaves the reader with no signal.
        if (result.error || !result.data?.accepted) {
          log.warn('question was not answered', { task: task.id, question: questionId, error: result.error });
          setFailed(true);
        } else {
          setStranded(!result.data.resumed);
        }
      } catch (err) {
        log.catch(err);
        setFailed(true);
      } finally {
        setBusy(false);
      }
    },
    [busy, invokePromise, task, questionId],
  );

  const thread = Task.getQuestions(snapshot?.history).find(({ question }) => question.id === questionId);
  if (!thread) {
    return null;
  }

  return (
    <Card.Body data-testid='question-card'>
      <Card.Row>
        <TaskQuestion
          classNames='w-full'
          thread={thread}
          busy={busy}
          message={failed ? t('question-failed.message') : stranded ? t('question-stranded.message') : undefined}
          onAnswer={(answer) => void handleAnswer(answer)}
        />
      </Card.Row>
    </Card.Body>
  );
};

QuestionCard.displayName = QUESTION_CARD_NAME;
