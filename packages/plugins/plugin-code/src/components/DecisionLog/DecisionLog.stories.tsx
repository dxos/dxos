//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import DEUS_SPEC from '../../../../../reflect/deus/SPEC.mdl?raw';
import CANVAS_AUTOGROW_SPEC from '../ChangelogGraph/__fixtures__/canvas-autogrow.mdl?raw';
import { answerQuestion } from '../ChangelogGraph/index.ts';
import { DecisionLog } from './DecisionLog.tsx';

const meta = {
  title: 'plugins/plugin-code/components/DecisionLog',
  component: DecisionLog,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'column' })],
  parameters: { translations: [...translations, ...reactUiTranslations] },
} satisfies Meta<typeof DecisionLog>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A person's decisions, then the agent's at the bottom: approvals, supersedes and who an agent acted for. */
export const Default: Story = {
  args: { content: CANVAS_AUTOGROW_SPEC },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deciders = await waitFor(() => canvas.getAllByTestId('decision-log.decider'));
    const actors = deciders.map((section) => section.dataset.actor);
    await expect(actors.indexOf('agent')).toBeGreaterThan(actors.lastIndexOf('user'));
  },
};

/** The Deus log with one decision highlighted, as a gutter chip in the spec selects it. */
export const Selected: Story = {
  args: { content: DEUS_SPEC, selected: 'D-4' },
};

/** Questions lead the log, open ones first; answering one appends the decision that answers it. */
export const Questions: Story = {
  args: { content: CANVAS_AUTOGROW_SPEC },
  render: (args) => {
    const [content, setContent] = useState(args.content);
    const handleAnswer = useCallback(
      (question: string, answer: string) =>
        setContent((current) => {
          const edit = answerQuestion(current, { question, answer, by: 'user:alice', date: '2026-10-10' });
          return edit ? current.slice(0, edit.from) + edit.insert + current.slice(edit.to) : current;
        }),
      [],
    );
    return <DecisionLog content={content} onAnswer={handleAnswer} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const questions = await waitFor(() => canvas.getAllByTestId('decision-log.question'));
    await expect(questions.map((question) => question.dataset.question)).toEqual(['Q-2', 'Q-1']);
    await userEvent.click(within(questions[0]).getAllByTestId('task-question.option')[0]);
    await waitFor(() =>
      expect(
        canvas.getAllByTestId('decision-log.question').find((question) => question.dataset.question === 'Q-2')?.dataset
          .answered,
      ).toBe(''),
    );
    await expect(canvas.getByText('Answered in D-13')).toBeInTheDocument();
  },
};

/** Questions without a way to answer, as a read-only spec shows them. */
export const ReadOnlyQuestions: Story = {
  args: { content: CANVAS_AUTOGROW_SPEC },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => canvas.getAllByTestId('decision-log.question'));
    await expect(canvas.queryByTestId('task-question.input')).toBeNull();
  },
};

/** A spec with no changelog. */
export const Empty: Story = {
  args: { content: '# No changelog here.' },
};
