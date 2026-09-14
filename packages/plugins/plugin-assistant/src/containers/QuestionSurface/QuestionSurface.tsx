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
import { Question } from '@dxos/types';

import { meta } from '#meta';

import { QuestionCard } from '../QuestionCard/QuestionCard.tsx';

const QUESTION_SURFACE_NAME = 'QuestionSurface';

export type QuestionSurfaceProps = {
  /** Object id of the question, as the agent wrote it into the `<surface>` block. */
  question?: string;
};

/**
 * A question rendered inline in the conversation, from the id the agent emitted.
 *
 * The chrome is composed here because the thread is not a card host: a popover or a plank supplies
 * `Card.Root` and the header around a `CardContent` surface, and nothing does inside a message. The
 * composition mirrors the deck's popover host so the same body reads identically in both.
 *
 * The id is looked up rather than carried as a payload, so the card shows the live object: an
 * answer given here and one given from the task have to be the same answer.
 */
export const QuestionSurface = ({ question: id }: QuestionSurfaceProps) => {
  const { t } = useTranslation(meta.profile.key);
  const space = useActiveSpace();
  // Validated before it reaches `Filter.id`, which asserts on its arguments: this id is written by
  // a model, so a truncated or hallucinated one is the expected case, and an unguarded filter
  // would throw during render inside the transcript rather than render nothing.
  const valid = id !== undefined && EntityId.isValid(id) ? id : undefined;
  const filter = useMemo(() => (valid ? Filter.id(valid) : Filter.nothing()), [valid]);
  const [object] = useQuery(valid ? space?.db : undefined, filter);
  // Before the guard below, so the hook count is stable; it answers `[]` for a missing subject.
  const menuItems = useObjectMenuItems(object);
  if (!object || !Obj.instanceOf(Question.Question, object)) {
    return null;
  }

  return (
    // `fullWidth`: a card defaults to `dx-card-max-width`, which is right where cards are laid out
    // beside each other and wrong in a message, where the thread's column is the width to fill.
    <Card.Root fullWidth classNames='my-2'>
      <Card.Header>
        <Card.Block>
          <CardIconSlot subject={object}>
            <Icon icon={Obj.getIcon(object)?.icon ?? 'ph--question--regular'} />
          </CardIconSlot>
        </Card.Block>
        <Card.Title>{object.text}</Card.Title>
        {/* Same trailing slot the deck's popover host gives every card, so a question in a message
            offers the actions a question anywhere else does. */}
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
      <QuestionCard subject={object} />
    </Card.Root>
  );
};

QuestionSurface.displayName = QUESTION_SURFACE_NAME;
