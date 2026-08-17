//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryContext, type StoryObj } from '@storybook/react-vite';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useCallback, useMemo, useState } from 'react';

import { Feed, Filter, Obj, Order, Query, Scope, Tag } from '@dxos/echo';
import { useQuery, useResolveRef } from '@dxos/echo-react';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Panel, Toolbar } from '@dxos/react-ui';
import { Dnd } from '@dxos/react-ui-dnd';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { TagIndex } from '@dxos/schema';
import { type Actor, DraftMessage, Message, Person } from '@dxos/types';

import { type MessageOptions } from '#components';
import { ContactPreview, initializeMailbox } from '#testing';
import { translations } from '#translations';
import { Mailbox } from '#types';

import { createDraftMessage } from '../../util';
import { ConversationStack } from './ConversationStack';

type StoryArgs = {
  length?: number;
  /** Show a story-only Reply button that appends a reply draft to the thread. */
  reply?: boolean;
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
const DefaultStory = ({ reply }: StoryArgs) => {
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

  // Creating the contact must actually add a Person, otherwise the create affordance appears to do
  // nothing and the seeded 50/50 split can never be exercised.
  const handleContactCreate = useCallback(
    (actor: Actor.Actor) => {
      if (space && actor.email) {
        space.db.add(Person.make({ fullName: actor.name ?? actor.email, emails: [{ value: actor.email }] }));
      }
    },
    [space],
  );

  // Story-only stand-in for the message toolbar's Reply action: appends a reply draft to the
  // thread's last message, exercising the append-scroll-autofocus path in `ConversationStack.Content`.
  const handleReply = useCallback(() => {
    const last = messages.filter((message) => !DraftMessage.instanceOf(message)).at(-1);
    if (space && mailbox && last) {
      space.db.add(Obj.make(Message.Message, createDraftMessage({ mode: 'reply', message: last, mailbox })));
    }
  }, [space, mailbox, messages]);

  if (!space?.db || !mailbox) {
    return <Loading />;
  }

  return (
    // Outside Composer nothing answers `DxAnchorActivate`, so without this host the avatar hover
    // silently does nothing and the story would appear to show a broken affordance.
    <ContactPreview db={space.db}>
      <ConversationStack.Root
        attendableId='story'
        items={messages}
        mailbox={mailbox}
        options={optionsAtom}
        expanded={expanded}
        onExpandedChange={handleExpandedChange}
        onContactCreate={handleContactCreate}
      >
        <Dnd.Root>
          <Panel.Root role='article'>
            {reply && (
              <Panel.Toolbar asChild>
                <Toolbar.Root>
                  <Toolbar.Button onClick={handleReply} data-testid='story-reply'>
                    Reply
                  </Toolbar.Button>
                </Toolbar.Root>
              </Panel.Toolbar>
            )}
            <Panel.Content asChild>
              <ConversationStack.Content />
            </Panel.Content>
          </Panel.Root>
        </Dnd.Root>
      </ConversationStack.Root>
    </ContactPreview>
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

          // Half the senders get a Person, so the avatar shows BOTH states side by side: a resolved
          // contact whose card opens on hover, and an unknown one offering to create it. Seeding all or
          // none leaves one of the two states untestable. Derived from the FEED-scoped messages above —
          // a bare space query does not see feed messages, and would silently seed nobody.
          const senders = [
            ...new Set(
              messages
                .map((message) => message.sender?.email)
                .filter((email): email is string => typeof email === 'string' && email.length > 0),
            ),
          ];
          senders.forEach((email, index) => {
            if (index % 2 === 0) {
              space.db.add(Person.make({ fullName: email.split('@')[0], emails: [{ value: email }] }));
            }
          });
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

/**
 * Test:
 * 1. Press "Reply" in the toolbar. A draft tile appears after the thread's last message, scrolled
 *    fully into view, with To and `Re:` subject prefilled from that message.
 * 2. The BODY editor has focus — typing immediately lands in the draft body, not a recipient field.
 * 3. The draft's header fields (To / Cc / Bcc / subject) render as an aligned label/field grid with
 *    vertical separation; reveal Cc and Bcc via the links on the To row to see all rows align.
 */
export const ReplyDraftManual: Story = {
  args: {
    reply: true,
  },
};
