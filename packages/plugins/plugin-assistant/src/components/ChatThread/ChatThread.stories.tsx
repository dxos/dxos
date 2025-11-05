//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import React, { type CSSProperties, useEffect, useMemo } from 'react';

import { ContextQueueService, DatabaseService } from '@dxos/functions';
import { faker } from '@dxos/random';
import { useQueue, useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Popover } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { MarkdownStream } from '@dxos/react-ui-components';
import { PreviewPopoverProvider, usePreviewPopover } from '@dxos/react-ui-editor/testing';
import { Card } from '@dxos/react-ui-stack';
import { DataType } from '@dxos/schema';

import { createMessageGenerator } from '../../testing';
import { translations } from '../../translations';

import { ChatThread, type ChatThreadProps } from './ChatThread';
import { componentRegistry } from './registry';
import TEXT from './testing/thread.md?raw';

faker.seed(1);

type MessageGenerator = Effect.Effect<void, never, DatabaseService | ContextQueueService>;

type StoryProps = ChatThreadProps & { generator?: MessageGenerator[]; delay?: number };

const DefaultStory = ({ generator = [], delay = 0, ...props }: StoryProps) => {
  const space = useSpace();
  const queueDxn = useMemo(() => space?.queues.create().dxn, [space]);
  const queue = useQueue<DataType.Message.Message>(queueDxn);

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
      }).pipe(Effect.provide(Layer.mergeAll(DatabaseService.layer(space.db), ContextQueueService.layer(queue)))),
    );

    return () => {
      void Effect.runPromise(Fiber.interrupt(fiber));
    };
  }, [space, queue, generator]);

  return (
    <PreviewPopoverProvider
      onLookup={async ({ label, ref }) => {
        return { label, text: ref };
      }}
    >
      <ChatThread {...props} messages={queue?.objects ?? []} />
      <PreviewCard />
    </PreviewPopoverProvider>
  );
};

const PreviewCard = () => {
  const { target } = usePreviewPopover('PreviewCard');

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
  render: DefaultStory,
  decorators: [
    withTheme,
    withLayout({ container: 'column' }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [DataType.Organization.Organization, DataType.Person.Person],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof ChatThread>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    generator: createMessageGenerator(),
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
      <MarkdownStream registry={componentRegistry} content={TEXT} />
    </div>
  ),
};
