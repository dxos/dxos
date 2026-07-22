//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { AiService } from '@dxos/ai';
import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayerSpec } from '@dxos/compute';
import { Topic } from '@dxos/compute';
import { Filter, Obj, Ref } from '@dxos/echo';
import { mockAiService } from '@dxos/extractor/testing';
import { DXN } from '@dxos/keys';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { InboxOperation, Mailbox } from '@dxos/plugin-inbox';
import { InboxPlugin } from '@dxos/plugin-inbox/testing';
import { translations as inboxTranslations } from '@dxos/plugin-inbox/translations';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Button } from '@dxos/react-ui';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { AnchoredTo, Message } from '@dxos/types';

// Story-only mock AiService so `CreateTopicFromMessage`'s LLM summary step runs without a real provider.
const MockAiServicePlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('story.inbox.mockAiService'), name: 'Story Mock AI Service' }),
).pipe(
  Plugin.addModule({
    id: 'ai-service',
    provides: [Capabilities.LayerSpec],
    activate: () =>
      Effect.succeed([
        Capability.contribute(
          Capabilities.LayerSpec,
          LayerSpec.make({ affinity: 'application', requires: [], provides: [AiService.AiService] }, () =>
            mockAiService({ text: 'A concise topic summary.' }),
          ),
        ),
      ]),
  }),
  Plugin.make,
);

const Story = () => {
  const [space] = useSpaces();
  const [mailbox] = useQuery(space?.db, Filter.type(Mailbox.Mailbox));
  const topics = useQuery(space?.db, Filter.type(Topic.Topic));
  const { invokePromise } = useOperationInvoker();

  const handleCreate = useCallback(() => {
    if (!mailbox || !space) {
      return;
    }
    const message = Obj.make(Message.Message, {
      created: '2026-01-01T10:00:00.000Z',
      sender: { email: 'alice@example.com' },
      blocks: [{ _tag: 'text', text: 'Kickoff details.' }],
      properties: { subject: 'Project kickoff', messageId: '<kickoff>' },
    });
    void invokePromise(
      InboxOperation.CreateTopicFromMessage,
      { mailbox: Ref.make(mailbox), message },
      { spaceId: space.id },
    );
  }, [mailbox, space, invokePromise]);

  if (!space?.db || !mailbox) {
    return <Loading data={{ db: !!space?.db, mailbox: !!mailbox }} />;
  }

  return (
    <div className='flex flex-col bs-full'>
      <Button onClick={handleCreate}>Create Topic</Button>
      {/* Accepted/created topics render in the space-level Topics section (plugin-brain); this story
          asserts creation via the space db count rather than an inbox list. */}
      <div className='grow' data-testid='topic-count' data-count={topics.length} />
    </div>
  );
};

const meta = {
  title: 'stories/stories-inbox/CreateTopic',
  render: Story,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withTheme(),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Mailbox.Mailbox, Topic.Topic, AnchoredTo.AnchoredTo, Message.Message],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(async () => {
                personalSpace.db.add(Mailbox.make());
                await personalSpace.db.flush({ indexes: true });
              });
            }),
        }),
        StorybookPlugin({}),
        InboxPlugin(),
        MockAiServicePlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations: [...inboxTranslations, ...reactUiTranslations],
  },
} satisfies Meta<typeof Story>;

export default meta;

type StoryType = StoryObj<typeof meta>;

export const Default: StoryType = {};

/** Clicking "Create Topic" invokes the operation and materializes a `Topic` in the space db. */
export const Test: StoryType = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = await waitFor(() => canvas.getByRole('button', { name: /create topic/i }));
    // No topics initially.
    void expect(canvas.getByTestId('topic-count').getAttribute('data-count')).toBe('0');

    await userEvent.click(button);

    // The operation clusters the single thread and materializes one Topic.
    await waitFor(() => expect(canvas.getByTestId('topic-count').getAttribute('data-count')).toBe('1'), {
      timeout: 10_000,
    });
  },
};
