//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import { random } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { Thread as ThreadComponent } from '@dxos/react-ui-thread';
import * as Card from '@dxos/react-ui/Card';
import * as Hooks from '@dxos/react-ui/Hooks';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Message, Thread } from '@dxos/types';

import { translations } from '#translations';

import { ThreadArticle } from './ThreadArticle.tsx';

const MESSAGE_COUNT = 30;

const OTHER_SENDER_COUNT = 3;

/**
 * A conversation between the local identity and a few named participants, with varied lengths and
 * spacing, so the thread shows author alignment, grouping and scrolling.
 */
const makeThreadMessages = (identityDid: string, count: number): Message.Message[] => {
  random.seed(1);
  const others = Array.from({ length: OTHER_SENDER_COUNT }, () => ({ name: random.person.fullName() }));
  let time = Date.parse('2026-03-02T09:00:00.000Z');
  return Array.from({ length: count }, (_, index) => {
    time += random.number.int({ min: 1, max: 90 }) * 60 * 1000;
    const text =
      index % 8 === 5 ? random.lorem.paragraphs({ min: 2, max: 3 }) : random.lorem.sentences({ min: 1, max: 3 });
    return Message.make({
      created: new Date(time).toISOString(),
      // Every third message is the local user's own, matched by DID like a message sent from the textbox.
      sender: index % 3 === 1 ? { identityDid } : { role: 'user', ...random.helpers.arrayElement(others) },
      blocks: [{ _tag: 'text', text }],
    });
  });
};

/** Card content for referenced objects, as a type's `CardContent` surface would render it. */
const ObjectCardContent = ({ subject }: { subject: Obj.Unknown }) => (
  <Card.Body>
    <Card.Row>
      <Card.Text truncate>{Obj.getLabel(subject) ?? subject.id}</Card.Text>
    </Card.Row>
  </Card.Body>
);

const DefaultStory = () => {
  const client = useClient();
  const identity = useIdentity();
  const [space, setSpace] = useState<Space>();
  const [thread, setThread] = useState<Thread.Thread | null>();

  Hooks.useAsyncEffect(async () => {
    if (identity) {
      const space = await client.spaces.create();
      const thread = space.db.add(Thread.make({ status: 'active' }));
      await space.db.appendToFeed(await thread.feed.load(), makeThreadMessages(identity.did, MESSAGE_COUNT));
      setSpace(space);
      setThread(thread);
    }
  }, [identity]);

  if (!identity || !thread || !space) {
    return <Loading data={{ identity: !!identity, space: !!space, thread: !!thread }} />;
  }

  return <ThreadArticle thread={thread} />;
};

const meta = {
  title: 'plugins/plugin-thread/containers/ThreadArticle',
  component: ThreadComponent.Root as any,
  render: DefaultStory,
  decorators: [
    withMosaic(),
    withLayout({ layout: 'column' }),
    // TODO(wittjosiah): This shouldn't depend on app framework (use withClientProvider instead).
    //  Currently this is required because MessageThread renders an object tile via a Surface.
    withPluginManager({
      plugins: CorePlugins.make(),
      capabilities: [
        Capability.contribute(
          Capabilities.ReactSurface,
          Surface.create({
            id: 'test',
            filter: Surface.makeFilter(AppSurface.CardContent),
            component: ObjectCardContent,
            props: ({ data: { subject } }) => ({ subject }),
          }),
        ),
      ],
    }),
    withClientProvider({
      createSpace: true,
      types: [Thread.Thread, Message.Message],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
