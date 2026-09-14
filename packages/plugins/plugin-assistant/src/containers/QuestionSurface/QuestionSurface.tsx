//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
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
 * The id is looked up rather than carried as a payload: the card must show the live object — an
 * answer given here, or from the task, has to be the same answer everywhere — and a model-written
 * payload could not be trusted to be the question's current state in any case.
 */
export const QuestionSurface = ({ question: id }: QuestionSurfaceProps) => {
  const space = useActiveSpace();
  const [object] = useQuery(id ? space?.db : undefined, Filter.id(id ?? ''));
  if (!object || !Obj.instanceOf(Question.Question, object)) {
    return null;
  }

  return <QuestionCard subject={object} />;
};

QuestionSurface.displayName = QUESTION_SURFACE_NAME;
