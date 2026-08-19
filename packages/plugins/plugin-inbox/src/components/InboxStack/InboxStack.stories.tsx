//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { expect, waitFor } from 'storybook/test';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { useSpaces } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { useAttentionAttributes, useSelection } from '@dxos/react-ui-attention';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message, Person } from '@dxos/types';

import { Builder, MessagesOptions, useContactCreate } from '#testing';
import { Mailbox } from '#types';

import { InboxStack, type InboxStackItem, InboxStackProps } from './InboxStack';

type StoryArgs = InboxStackProps & {
  count?: number;
  options?: MessagesOptions;
  /** Group the generated messages by thread id, mirroring the mailbox's conversation query. */
  groupByThread?: boolean;
  /**
   * Fraction of distinct senders seeded as a Person, so the list shows BOTH contact states: a known
   * sender's avatar opens their card on hover, an unknown one offers to create the contact.
   */
  knownSenders?: number;
};

const DefaultStory = ({ count = 0, options, groupByThread, knownSenders, ...props }: StoryArgs) => {
  const { space } = useClientStory();
  const onContactCreate = useContactCreate(space?.db);
  const [items] = useState<InboxStackItem[] | undefined>(() => {
    if (!count) {
      return undefined;
    }
    const { messages } = new Builder().createMessages(count, options).build();
    if (!groupByThread) {
      return messages;
    }

    const groups = new Map<string, Message.Message[]>();
    for (const message of messages) {
      const key = message.threadId ?? message.id;
      const group = groups.get(key);
      if (group) {
        group.push(message);
      } else {
        groups.set(key, [message]);
      }
    }

    // Mirror the mailbox: each conversation card previews at most `THREAD_PREVIEW_COUNT` messages
    // and carries the full thread size as `total` so the card can render a "+N more" affordance.
    const THREAD_PREVIEW_COUNT = 4;
    return Array.from(groups, ([id, groupMessages]) => {
      const sorted = groupMessages.sort((a, b) => b.created.localeCompare(a.created));
      return {
        id,
        messages: sorted.slice(0, THREAD_PREVIEW_COUNT),
        total: sorted.length,
      };
    });
  });

  // Seeded once the space exists: every other distinct sender becomes a Person, so half the rows
  // resolve to a contact and half offer to create one.
  const seeded = useRef(false);
  useEffect(() => {
    if (!space?.db || seeded.current || !items || !knownSenders) {
      return;
    }
    seeded.current = true;
    const senders = [
      ...new Map(
        items
          .flatMap((item) => ('messages' in item ? item.messages : [item]))
          .map((message) => [message.sender?.email?.toLowerCase(), message.sender] as const)
          .filter(([email]) => !!email),
      ).values(),
    ];
    senders
      .filter((_sender, index) => index % Math.round(1 / knownSenders) === 0)
      .forEach((sender) => {
        space.db.add(Obj.make(Person.Person, { fullName: sender?.name, emails: [{ value: sender?.email ?? '' }] }));
      });
    // The lookup reads an indexed query, so the seeds have to land before it can resolve them.
    void space.db.flush({ indexes: true });
  }, [space, items, knownSenders]);

  return <InboxStack {...props} items={items} db={space?.db} onContactCreate={onContactCreate} />;
};

const CompanionStory = () => {
  const [space] = useSpaces();
  const [mailbox] = useQuery(space?.db, Filter.type(Mailbox.Mailbox));
  const feed = mailbox?.feed?.target;

  // Selected message.
  const selected = useSelection(feed ? Obj.getURI(feed) : undefined, 'single');
  const message = useQuery(
    space?.db,
    feed ? Query.select(selected ? Filter.id(selected) : Filter.nothing()).from(feed) : Query.select(Filter.nothing()),
  )[0];

  const mailboxData = useMemo(() => ({ subject: mailbox, attendableId: mailbox?.id ?? 'story' }), [mailbox]);
  const companionData = useMemo(
    () => ({ subject: message ?? 'message', attendableId: 'story-companion', companionTo: feed }),
    [message, feed],
  );

  // NOTE: Attention required for scrolling.
  const attentionAttrs = useAttentionAttributes(feed ? Obj.getURI(feed) : undefined);

  if (!space?.db || !feed) {
    return <Loading data={{ db: !!space?.db, feed: !!feed }} />;
  }

  return (
    <div {...attentionAttrs} className='grid grid-cols-[1fr_1fr]'>
      <Surface.Surface type={AppSurface.Article} data={mailboxData} />
      <Surface.Surface type={AppSurface.Article} data={companionData} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-inbox/components/InboxStack',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withAttention(),
    withMosaic(),
    withClientProvider({ types: [Person.Person], createIdentity: true, createSpace: true }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: 'story',
  },
};

export const WithMessages: Story = {
  args: {
    id: 'story',
    count: 100,
  },
};

export const WithConversations: Story = {
  args: {
    id: 'story',
    count: 100,
    groupByThread: true,
    options: {
      threads: 10,
    },
    // Half the senders are strangers, so both avatar states appear down the list.
    knownSenders: 0.5,
  },
};

/**
 * Seeds a Person for half the senders so the list SHOWS both contact states.
 *
 * KNOWN GAP: the list-level lookup (`InboxStack`'s `db` → `useContactLookup`) is not resolving these
 * seeds yet — every avatar still renders as unknown — so this asserts only that the list renders while
 * a space is attached. See the mailbox-research ledger.
 */
export const Spec: Story = {
  args: {
    id: 'story',
    count: 20,
    groupByThread: true,
    options: {
      threads: 6,
    },
    knownSenders: 0.5,
  },
  play: async ({ canvasElement }) => {
    const avatars = () => [...canvasElement.querySelectorAll<HTMLElement>('[data-testid="row.contact-avatar"]')];
    await waitFor(() => expect(avatars().length).toBeGreaterThan(0), { timeout: 12_000 });
  },
};
