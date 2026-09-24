//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { CardIconSlot, useActiveSpace, useObjectMenuItems } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { EntityId } from '@dxos/keys';
import { Card, Icon, IconButton, useTranslation } from '@dxos/react-ui';
import { ActionMenu } from '@dxos/react-ui-menu';
import { Task } from '@dxos/types';

import { meta } from '#meta';

import { QuestionCard } from '../QuestionCard/QuestionCard.tsx';

const QUESTION_SURFACE_NAME = 'QuestionSurface';

export type QuestionSurfaceProps = {
  /** Object id of the task the question was filed on, as the agent wrote it into the `<surface>` block. */
  task?: string;
  /** Id of the question's entry in the task's history. */
  question?: string;
};

/**
 * A question rendered inline in the conversation, from the ids the agent emitted.
 *
 * The chrome is composed here because the thread is not a card host: a popover or a plank supplies
 * `Card.Root` and the header around a card body, and nothing does inside a message.
 *
 * The task is looked up rather than the question carried as a payload, so the card shows the live
 * history: an answer given here and one given from the task's row have to be the same answer.
 */
export const QuestionSurface = ({ task: taskId, question: questionId }: QuestionSurfaceProps) => {
  const { t } = useTranslation(meta.profile.key);
  const space = useActiveSpace();
  // Validated before it reaches `Filter.id`, which asserts on its arguments: this id is written by
  // a model, so a truncated or hallucinated one is the expected case, and an unguarded filter
  // would throw during render inside the transcript rather than render nothing.
  const valid = taskId !== undefined && EntityId.isValid(taskId) ? taskId : undefined;
  const filter = useMemo(() => (valid ? Filter.id(valid) : Filter.nothing()), [valid]);
  const [object] = useQuery(valid ? space?.db : undefined, filter);
  // Before the guard below, so the hook count is stable; it answers `[]` for a missing subject.
  const menuItems = useObjectMenuItems(object);
  if (!object || !Obj.instanceOf(Task.Task, object) || !questionId) {
    return null;
  }

  return (
    // `fullWidth`: a card defaults to `dx-card-max-width`, which is right where cards are laid out
    // beside each other and wrong in a message, where the thread's column is the width to fill.
    <Card.Root fullWidth classNames='my-2'>
      <Card.Header>
        <Card.Block>
          <CardIconSlot subject={object}>
            <Icon icon='ph--question--regular' />
          </CardIconSlot>
        </Card.Block>
        {/* The task, not the question: a `Card.Title` truncates to one line by design, and the
            question is a sentence the reader has to read in full — so the body carries it. */}
        <Card.Title>{object.title}</Card.Title>
        {/* The task's actions, as a task card anywhere else offers them. */}
        <Card.Block end>
          <ActionMenu disabled={!menuItems.length} actions={menuItems}>
            <IconButton
              variant='ghost'
              density='sm'
              icon='ph--dots-three-vertical--regular'
              iconOnly
              label={t('question-actions.label')}
            />
          </ActionMenu>
        </Card.Block>
      </Card.Header>
      <QuestionCard task={object} questionId={questionId} />
    </Card.Root>
  );
};

QuestionSurface.displayName = QUESTION_SURFACE_NAME;
