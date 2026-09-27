//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import { useCapabilities, useCapability } from '@dxos/app-framework/ui';
import { Blob, type Database, Feed, Filter, Obj, Query, Ref, Scope } from '@dxos/echo';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { InboxPlugin, initializeMailbox, seedSummaries } from '@dxos/plugin-inbox/testing';
import { translations as inboxTranslations } from '@dxos/plugin-inbox/translations';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import {
  Cell,
  ModuleContainer,
  type ModuleContainerProps,
  UpdateCompanionStubPlugin,
  createStoryDecorators,
} from '@dxos/storybook-testing';
import { Message, Person } from '@dxos/types';

import { StoryRole } from '../modules/index.ts';
import { StoryModulesPlugin } from '../testing/modules.tsx';

type StoryArgs = {
  /** Number of messages to seed. */
  count?: number;
  /** Size of the thread-id pool messages are randomly assigned to (fewer → larger conversations). */
  threads?: number;
  /** Force conversation grouping on/off; when omitted, the persisted/product-default value applies. */
  conversations?: boolean;
  /** Attaches a real PDF blob to the first message and lays out the three deck planks. */
  attachments?: boolean;
} & Pick<ModuleContainerProps, 'columns'>;

// A minimal but structurally valid PDF, so the third column exercises the browser's real viewer
// rather than the unsupported fallback.
const MINIMAL_PDF =
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n' +
  'trailer<</Root 1 0 R>>';

/** The message `seedAttachment` attached the PDF to, so the play function opens that one. */
let attachedMessageId: string | undefined;

/** Attaches a PDF blob to the mailbox's first feed message. */
const seedAttachment = async (db: Database.Database, mailbox: Mailbox.Mailbox) => {
  const feed = await mailbox.feed.tryLoad();
  if (!feed) {
    return;
  }
  const [message] = await db
    .query(Query.select(Filter.type(Message.Message)).from([Scope.feed(Obj.getURI(feed, { prefer: 'absolute' }))]))
    .run();
  if (!message) {
    return;
  }
  const bytes = new TextEncoder().encode(MINIMAL_PDF);
  const blob = db.add(Blob.make({ type: 'application/pdf', size: bytes.byteLength, data: Blob.inlineData(bytes) }));
  // Feed messages are immutable, so the attachment is recorded on the space-side object the query
  // returned; that is the same instance the article renders.
  Obj.update(message, (message) => {
    message.attachments = [{ name: 'invoice.pdf', ref: Ref.make(blob) }];
  });
  attachedMessageId = message.id;
  await db.flush({ indexes: true });
};

/** The seeded layout; forces conversation grouping per variant, independent of any persisted value. */
const DefaultStory = ({ conversations, columns }: StoryArgs) => {
  const registry = useCapability(Capabilities.AtomRegistry);
  const [settingsAtom] = useCapabilities(InboxCapabilities.Settings);
  useEffect(() => {
    if (settingsAtom && conversations !== undefined) {
      registry.set(settingsAtom, { ...registry.get(settingsAtom), conversations });
    }
  }, [registry, settingsAtom, conversations]);

  return <ModuleContainer columns={columns} />;
};

const meta = {
  title: 'stories/stories-inbox/MailboxArticle',
  render: DefaultStory,
  decorators: createStoryDecorators<StoryArgs>(({ args: { count = 0, threads = 10, attachments = false } }) => ({
    types: [Blob.Blob, Feed.Feed, Mailbox.Mailbox, Message.Message, Person.Person],
    plugins: [InboxPlugin(), PreviewPlugin.make(), UpdateCompanionStubPlugin(), StoryModulesPlugin()],
    onInit: async ({ space }) => {
      const mailbox = await initializeMailbox(space.db, count, threads);
      await seedSummaries(space.db, mailbox);
      if (attachments) {
        await seedAttachment(space.db, mailbox);
        // Mailbox → Message → Attachment: the three planks the deck shows when a reader drills from
        // the list into a message and then into one of its attachments.
        return [[Cell.article(mailbox)], [StoryRole.SelectedMessage], [StoryRole.Attachment]];
      }

      return [[Cell.article(mailbox)], [StoryRole.SelectedMessageJson, StoryRole.SelectedMessageBlocks]];
    },
  })),
  parameters: {
    layout: 'fullscreen',
    translations: inboxTranslations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Clicks the tile for `id` (else the first) once the seeded list has rendered. */
const selectTile = async (canvasElement: HTMLElement, id?: string) => {
  const tile = await waitFor(
    () => {
      const found = canvasElement.querySelector<HTMLElement>(
        id ? `[data-object-id="${CSS.escape(id)}"]` : '[data-object-id]',
      );
      if (!found) {
        throw new Error('No mailbox tile rendered.');
      }
      return found;
    },
    { timeout: 12_000 },
  );
  await userEvent.click(tile);
};

/**
 * The mailbox beside the selected message's object JSON and its content blocks (annotation summaries
 * included), so what the list displays can be read against the objects behind it.
 */
export const Default: Story = {
  args: {
    count: 50,
    conversations: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findAllByText('Select a message', undefined, { timeout: 12_000 });

    // Selecting a row publishes the selection under the mailbox cell's attendable id, which the
    // diagnostic cells follow.
    await selectTile(canvasElement);
    await expect(await canvas.findByTestId('message-json', undefined, { timeout: 5_000 })).toBeInTheDocument();
    await expect(await canvas.findByTestId('message-blocks', undefined, { timeout: 5_000 })).toBeInTheDocument();
  },
};

export const Conversations: Story = {
  args: {
    count: 50,
    conversations: true,
    columns: '2fr_1fr',
  },
};

/**
 * The deck's three planks side by side: pick a row to fill the message column, then click that
 * message's attachment chip to fill the attachment column. Seeded with a real PDF blob, so the third
 * column exercises the browser's viewer rather than the unsupported fallback.
 */
export const Attachments: Story = {
  args: {
    count: 10,
    conversations: false,
    attachments: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText('Open an attachment', undefined, { timeout: 12_000 });

    await selectTile(canvasElement, attachedMessageId);
    await waitFor(() => expect(canvas.queryByText('Select a message')).toBeNull(), { timeout: 5_000 });
    await userEvent.click(await canvas.findByText('invoice.pdf', undefined, { timeout: 5_000 }));
    await waitFor(() => expect(canvas.queryByText('Open an attachment')).toBeNull(), { timeout: 5_000 });
  },
};
