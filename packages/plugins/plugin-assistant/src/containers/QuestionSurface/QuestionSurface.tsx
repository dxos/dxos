//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { EntityId } from '@dxos/keys';
import { Question } from '@dxos/types';

import { QuestionCard } from '../QuestionCard/QuestionCard.tsx';

const QUESTION_SURFACE_NAME = 'QuestionSurface';

export type QuestionSurfaceProps = {
  /** Object id of the question, as the agent wrote it into the `<surface>` block. */
  question?: string;
};

/**
 * Renders a question inline in the conversation from the id the agent emitted.
 *
 * The id is looked up rather than carried as a payload, so the card shows the live object: an
 * answer given here and one given from the task have to be the same answer.
 */
export const QuestionSurface = ({ question: id }: QuestionSurfaceProps) => {
  const space = useActiveSpace();
  // Validated before it reaches `Filter.id`, which asserts on its arguments: this id is written by
  // a model, so a truncated or hallucinated one is the expected case, and an unguarded filter
  // would throw during render inside the transcript rather than render nothing.
  const valid = id !== undefined && EntityId.isValid(id) ? id : undefined;
  const filter = useMemo(() => (valid ? Filter.id(valid) : Filter.nothing()), [valid]);
  const [object] = useQuery(valid ? space?.db : undefined, filter);
  if (!object || !Obj.instanceOf(Question.Question, object)) {
    return null;
  }

  return <QuestionCard subject={object} />;
};

QuestionSurface.displayName = QUESTION_SURFACE_NAME;
