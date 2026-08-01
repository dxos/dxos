//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { AiService } from '@dxos/ai';
import { ActivationEvents, Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { useOperationInvoker } from '@dxos/app-framework/ui';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { LayerSpec } from '@dxos/compute';
import { Filter, Obj, Ref } from '@dxos/echo';
import { mockAiService } from '@dxos/extractor/testing';
import { DXN } from '@dxos/keys';
import { Topic } from '@dxos/pipeline-email';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { InboxOperation, Mailbox } from '@dxos/plugin-inbox';
import { TopicsArticle } from '@dxos/plugin-inbox/containers';
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
    activatesOn: ActivationEvents.SetupProcessManager,
    activate: () =>
      Effect.succeed(
        Capability.contributes(
          Capabilities.LayerSpec,
          LayerSpec.make({ affinity: 'application', requires: [], provides: [AiService.AiService] }, () =>
            mockAiService({ text: 'A concise topic summary.' }),
          ),
        ),
      ),
  }),
  Plugin.make,
);

const Story = () => {
  const [space] = useSpaces();
  const [mailbox] = useQuery(space?.db, Filter.type(Mailbox.Mailbox));
  const topics = useQuery(space?.db, Filter.type(Topic));
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
      <div className='grow' data-testid='topic-count' data-count={topics.length}>
        <TopicsArticle role='article' space={space} attendableId='story' mailbox={mailbox} />
      </div>
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
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Mailbox.Mailbox, Topic, AnchoredTo.AnchoredTo, Message.Message],
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

/** Clicking "Create Topic" invokes the operation and a Topic (labelled from the message subject) appears. */
export const Test: StoryType = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // No topics initially.
    const button = await waitFor(() => canvas.getByRole('button', { name: /create topic/i }));
    void expect(canvas.queryByTestId('topic-card')).toBeNull();

    await userEvent.click(button);

    // The operation clusters the single thread and materializes a Topic (label from the subject tokens).
    const card = await waitFor(() => canvas.getByTestId('topic-card'), { timeout: 10_000 });
    void expect(within(card).getByText(/project|kickoff/i)).toBeInTheDocument();
  },
};
