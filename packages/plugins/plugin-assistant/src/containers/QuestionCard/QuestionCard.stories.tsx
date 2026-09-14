//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { Question, Task } from '@dxos/types';
import { trim } from '@dxos/util';

import { translations } from '#translations';

import * as AssistantPlugin from '../../AssistantPlugin.ts';
import { QuestionCard } from './QuestionCard.tsx';

const QUESTION_TEXT = 'How long is our refund window?';

/** The shape `ask-question` leaves behind: a blocked task with the question filed on it. */
const seed = (space: Space) => {
  const task = space.db.add(Task.make({ title: 'Draft the refund reply to Acme', status: 'blocked' }));
  const question = space.db.add(
    Question.make({
      text: QUESTION_TEXT,
      context: trim`
        Acme's order #4471 is 45 days old. Nothing in this project records the published window, or
        whether enterprise accounts get an exception.
      `,
      options: [
        { title: '30 days — no exception', description: 'Decline the refund, offer store credit.' },
        { title: '60 days for enterprise', description: 'Acme qualifies; approve the refund.' },
      ],
      task: Ref.make(task),
    }),
  );
  return question;
};

const DefaultStory = () => {
  const [space] = useSpaces();
  const [question] = useQuery(space?.db, Filter.type(Question.Question));
  if (!question) {
    return <Loading data={{ db: !!space?.db, question: false }} />;
  }

  return (
    <div className='w-96'>
      <QuestionCard role='card--content' subject={question} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/containers/QuestionCard',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'centered' }),
    // The plugin manager, not a bare client provider: answering invokes `AnswerQuestion` through
    // `useOperationInvoker`, which throws without PluginManagerContext.
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin.make({
          types: [Question.Question, Task.Task],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(async () => {
                seed(defaultSpace);
                await defaultSpace.db.flush({ indexes: true });
              });
            }),
        }),
        StorybookPlugin.make({}),
        // Contributes the operation handlers, `AnswerQuestion` among them — without it every
        // answer dies with NoHandlerError.
        AssistantPlugin.make(),
      ],
    }),
  ],
  parameters: {
    controls: { disable: true },
    translations: [...translations, ...reactUiTranslations],
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Picking a pre-baked answer records it, and the card collapses to what was decided. */
export const AnswerWithOption: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(QUESTION_TEXT, undefined, { timeout: 10_000 });
    await userEvent.click(canvas.getByText('30 days — no exception'));
    await waitFor(async () => await expect(canvas.getByTestId('question-card.answer')).toBeTruthy(), {
      timeout: 10_000,
    });
  },
};

/** The free-form field is always available, whatever options the asker offered. */
export const AnswerFreeForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(QUESTION_TEXT, undefined, { timeout: 10_000 });
    await userEvent.type(canvas.getByTestId('question-card.input'), 'Ask legal first');
    await userEvent.click(canvas.getByTestId('question-card.submit'));
    await waitFor(async () => await expect(canvas.getByTestId('question-card.answer')).toBeTruthy(), {
      timeout: 10_000,
    });
  },
};
