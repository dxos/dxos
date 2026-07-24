//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { type Meta, type StoryContext, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';

import { Feed, Filter, Obj, Order, Query, Scope, Tag } from '@dxos/echo';
import { useQuery, useResolveRef } from '@dxos/echo-react';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Panel } from '@dxos/react-ui';
import { Dnd } from '@dxos/react-ui-dnd';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { TagIndex } from '@dxos/schema';
import { Message, Person } from '@dxos/types';

import { type MessageOptions } from '#components';
import { initializeMailbox } from '#testing';
import { translations } from '#translations';
import { Mailbox } from '#types';

import { ConversationStack } from './ConversationStack';

type StoryArgs = {
  length?: number;
};

/** Tags applied to the seeded messages by index (some messages carry several tags). */
const MESSAGE_TAGS: { label: string; hue: string }[][] = [
  [{ label: 'Important', hue: 'red' }],
  [{ label: 'Investor', hue: 'amber' }],
  [
    { label: 'Team', hue: 'green' },
    { label: 'Eng', hue: 'cyan' },
  ],
  [{ label: 'Personal', hue: 'indigo' }],
  [{ label: 'Work', hue: 'violet' }],
];

/**
 * Renders the seeded mailbox's one thread through `ConversationStack` in isolation. The whole-thread
 * toolbar (view controls, collapse-all) belongs to `MessageArticle`, not the stack, so it is left out
 * here to keep the component's own surface — the message tiles and their per-message toolbars — clear.
 * Starts with every message collapsed; expand one by clicking its summary. (Deciding which message is
 * expanded by default — the most recent — is `MessageArticle`'s concern, exercised in its own story.)
 */
const DefaultStory = () => {
  const { space } = useClientStory();
  const [mailbox] = useQuery(space?.db, Filter.type(Mailbox.Mailbox));
  const feed = useResolveRef(mailbox?.feed);
  const messages = useQuery(
    space?.db,
    feed
      ? Query.select(Filter.type(Message.Message))
          .from([Scope.space(), Scope.feed(Obj.getURI(feed, { prefer: 'absolute' }))])
          .orderBy(Order.property('created', 'asc'))
      : Query.select(Filter.nothing()),
  );

  const optionsAtom = useMemo(() => Atom.make<MessageOptions>({ viewMode: 'html' }), []);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const handleExpandedChange = useCallback((id: string, isExpanded: boolean) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (isExpanded) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  if (!space?.db || !mailbox) {
    return <Loading />;
  }

  return (
    <ConversationStack.Root
      attendableId='story'
      items={messages}
      mailbox={mailbox}
      options={optionsAtom}
      expanded={expanded}
      onExpandedChange={handleExpandedChange}
      onContactCreate={() => {}}
    >
      <Dnd.Root>
        <Panel.Root role='article'>
          <Panel.Content asChild>
            <ConversationStack.Content />
          </Panel.Content>
        </Panel.Root>
      </Dnd.Root>
    </ConversationStack.Root>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/components/ConversationStack',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withClientProvider({
      types: [Feed.Feed, Mailbox.Mailbox, Message.Message, Person.Person, Tag.Tag, TagIndex.TagIndex],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }, { args: { length = 8 } = {} }: StoryContext<StoryArgs>) => {
        const mailbox = await initializeMailbox(space.db, length, 1);
        // Flush first so the appended feed messages are queryable below.
        await space.db.flush({ indexes: true });

        // Tag the first messages so the stack renders per-message tag chips.
        const feed = await mailbox.feed?.tryLoad();
        if (feed) {
          const messages = await space.db
            .query(
              Query.select(Filter.type(Message.Message))
                .from([Scope.space(), Scope.feed(Obj.getURI(feed, { prefer: 'absolute' }))])
                .orderBy(Order.property('created', 'asc')),
            )
            .run();
          for (const [index, tags] of MESSAGE_TAGS.entries()) {
            const message = messages[index];
            if (!message) {
              break;
            }
            for (const tag of tags) {
              await Mailbox.applyTag(mailbox, tag, message, space.db);
            }
          }
        }

        await space.db.flush({ indexes: true });
      },
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
