//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { Card, Icon } from '@dxos/react-ui';
import { CardContainer, type CardContainerProps } from '@dxos/react-ui-mosaic/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { Task } from '@dxos/types';
import { trim } from '@dxos/util';

import { translations } from '#translations';

import * as AssistantPlugin from '../../AssistantPlugin.ts';
import { QuestionCard } from './QuestionCard.tsx';

const QUESTION_TEXT = 'How long is our refund window?';

/** The shape `ask-question` leaves behind: a blocked task with the question in its history. */
const seed = (space: Space) => {
  const task = space.db.add(Task.make({ title: 'Draft the refund reply to Acme', status: 'blocked' }));
  Task.ask(task, {
    text: QUESTION_TEXT,
    context: trim`
      Acme's order #4471 is 45 days old. Nothing in this project records the published window, or
      whether enterprise accounts get an exception.
    `,
    options: [
      { title: '30 days — no exception', description: 'Decline the refund, offer store credit.' },
      { title: '60 days for enterprise', description: 'Acme qualifies; approve the refund.' },
    ],
    actor: { role: 'assistant', name: 'Scout' },
  });
};

/**
 * Both card roles side by side, composed the way the real hosts do (see plugin-preview's card
 * stories): the host draws `Card.Root` and the header, the surface draws only the body. A body that
 * looks right in one role and wrong in the other is the failure this story exists to catch.
 */
const DefaultStory = () => {
  const [space] = useSpaces();
  const [task] = useQuery(space?.db, Filter.type(Task.Task));
  const [question] = Task.getQuestions(task?.history);
  if (!task || !question) {
    return <Loading data={{ db: !!space?.db, question: false }} />;
  }

  const roles: CardContainerProps['role'][] = ['intrinsic', 'popover'];

  return (
    <div className='dx-fill grid grid-cols-2 py-16 gap-8'>
      {roles.map((role) => (
        <div key={role} className='flex h-full justify-center overflow-hidden'>
          <div className='flex flex-col gap-4 w-full items-center'>
            <span className='text-sm text-description'>{role}</span>
            <CardContainer role={role} icon='ph--question--regular'>
              <Card.Root border={false}>
                <Card.Header>
                  <Card.Block>
                    <Icon icon='ph--question--regular' />
                  </Card.Block>
                  <Card.Title>{task.title}</Card.Title>
                  <Card.Menu />
                </Card.Header>
                <QuestionCard task={task} questionId={question.question.id} />
              </Card.Root>
            </CardContainer>
          </div>
        </div>
      ))}
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/containers/QuestionCard',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    // The plugin manager, not a bare client provider: answering invokes `AnswerQuestion` through
    // `useOperationInvoker`, which throws without PluginManagerContext.
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin.make({
          types: [Task.Task],
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

/**
 * The story renders the body in both card roles, so every query matches twice — `getAllBy*` and the
 * first match, never `getBy*`, which throws on more than one.
 */
const firstCard = (canvas: ReturnType<typeof within>, testId: string): HTMLElement => {
  const matches = canvas.getAllByTestId(testId);
  return matches[0];
};

/** Picking a pre-baked answer records it, and the card collapses to what was decided. */
export const AnswerWithOption: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findAllByText(QUESTION_TEXT, undefined, { timeout: 10_000 });
    await userEvent.click(firstCard(canvas, 'task-question.option'));
    await waitFor(async () => await expect(canvas.getAllByTestId('task-question.answer').length).toBeGreaterThan(0), {
      timeout: 10_000,
    });
  },
};

/** The free-form field is always available, whatever options the asker offered. */
export const AnswerFreeForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findAllByText(QUESTION_TEXT, undefined, { timeout: 10_000 });
    await userEvent.type(firstCard(canvas, 'task-question.input'), 'Ask legal first');
    await userEvent.click(firstCard(canvas, 'task-question.submit'));
    await waitFor(async () => await expect(canvas.getAllByTestId('task-question.answer').length).toBeGreaterThan(0), {
      timeout: 10_000,
    });
  },
};
