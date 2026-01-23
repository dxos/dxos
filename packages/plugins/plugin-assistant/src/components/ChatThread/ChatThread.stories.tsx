//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import React, { type CSSProperties, useEffect, useMemo, useState } from 'react';

import { Database } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { ContextQueueService } from '@dxos/functions';
import { faker } from '@dxos/random';
import { useQueue, useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Popover } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { MarkdownStream } from '@dxos/react-ui-components';
import { EditorPreviewProvider, useEditorPreview } from '@dxos/react-ui-editor';
import { Card } from '@dxos/react-ui-mosaic';
import { render } from '@dxos/storybook-utils';
import { type Message, Organization, Person } from '@dxos/types';

import { createMessageGenerator } from '../../testing';
import { translations } from '../../translations';

import { ChatThread, type ChatThreadProps } from './ChatThread';
import { componentRegistry } from './registry';
import TEXT from './testing/thread.md?raw';

faker.seed(1);

type MessageGenerator = Effect.Effect<void, never, Database.Service | ContextQueueService>;

type StoryProps = { generator?: MessageGenerator[]; delay?: number; wait?: boolean } & ChatThreadProps;

const DefaultStory = ({ generator = [], delay = 0, wait, ...props }: StoryProps) => {
  const space = useSpace();
  const queueDxn = useMemo(() => space?.queues.create().dxn, [space]);
  const queue = useQueue<Message.Message>(queueDxn);
  const [done, setDone] = useState(false);

  // Generate messages.
  useEffect(() => {
    if (!space || !queue) {
      return;
    }

    const fiber = Effect.runFork(
      Effect.gen(function* () {
        for (const step of generator) {
          yield* step;
          if (delay) {
            yield* Effect.sleep(delay);
          }
        }
        setDone(true);
      }).pipe(Effect.provide(Layer.mergeAll(Database.Service.layer(space.db), ContextQueueService.layer(queue)))),
    );

    return () => {
      void runAndForwardErrors(Fiber.interrupt(fiber));
    };
  }, [space, queue, generator]);

  if (wait && !done) {
    return null;
  }

  return (
    <EditorPreviewProvider onLookup={async ({ label, ref }) => ({ label, text: ref })}>
      <ChatThread {...props} messages={queue?.objects} />
      <PreviewCard />
    </EditorPreviewProvider>
  );
};

const PreviewCard = () => {
  const { target } = useEditorPreview('PreviewCard');

  return (
    <Popover.Portal>
      <Popover.Content onOpenAutoFocus={(event) => event.preventDefault()}>
        <Popover.Viewport>
          <Card.SurfaceRoot role='card--popover'>
            <Card.Heading>{target?.label}</Card.Heading>
            {target && <Card.Text classNames='truncate line-clamp-3'>{target.text}</Card.Text>}
          </Card.SurfaceRoot>
        </Popover.Viewport>
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Portal>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/ChatThread',
  component: ChatThread,
  render: render(DefaultStory),
  decorators: [
    withTheme,
    withLayout({ layout: 'column' }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Organization.Organization, Person.Person],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<StoryProps>;

export default meta;

type Story = StoryObj<StoryProps>;

export const Default: Story = {
  args: {
    generator: createMessageGenerator(),
    wait: true,
  },
};

export const Delayed: Story = {
  args: {
    generator: createMessageGenerator(),
    delay: 1_000,
    fadeIn: true,
    cursor: false,
  },
};

export const Raw: Story = {
  render: () => (
    <div className='contents' style={{ '--user-fill': 'var(--dx-amberFill)' } as CSSProperties}>
      <MarkdownStream content={TEXT} />
    </div>
  ),
};

export const Static: Story = {
  render: () => (
    <div className='contents' style={{ '--user-fill': 'var(--dx-amberFill)' } as CSSProperties}>
      <MarkdownStream content={TEXT} registry={componentRegistry} />
    </div>
  ),
};
