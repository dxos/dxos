//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Format, Ref } from '@dxos/echo';
import { Channel } from '@dxos/types';

import * as ShowAndTell from './ShowAndTell.ts';

//
// The show-and-tell curator's tools: file each link shared in the channel as a table row, and read the rows back.
//

/** A link the model read in the message, with what it knows about it. */
export const SharedLink = Schema.Struct({
  url: Schema.String.annotate({ description: 'The link, exactly as it appears in the message or attachment list.' }),
  title: Schema.optional(Schema.String.annotate({ description: 'A short title: what the demo or page is.' })),
  category: Schema.optional(ShowAndTell.Category.annotate({ description: 'What it is; omit to have it guessed.' })),
  summary: Schema.optional(Schema.String.annotate({ description: 'One line on what it shows or why it was shared.' })),
});

export interface SharedLink extends Schema.Schema.Type<typeof SharedLink> {}

export const FiledEntry = Schema.Struct({
  link: Schema.String,
  title: Schema.String,
  category: ShowAndTell.Category,
  summary: Schema.String,
});

export interface FiledEntry extends Schema.Schema.Type<typeof FiledEntry> {}

/** Files every link of one shared message as a row; a link already filed for that message is skipped. */
export const FileLinks = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.discord.recordShowAndTellLinks'),
    name: 'File shared links',
    description:
      'Files the links (and attachments) of a show-and-tell message as rows of the space table: date, author, link, title, category, summary. Every link in `text` is filed, so pass the message text verbatim.',
    icon: 'ph--table--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    author: Schema.String.annotate({ description: 'Who shared it: the @username in the header.' }),
    text: Schema.String.annotate({ description: 'The message text, verbatim; every link in it is filed.' }),
    links: Schema.optional(
      Schema.Array(SharedLink).annotate({
        description: 'Titles, categories and summaries for the links, and attachments, which are not in `text`.',
      }),
    ),
    postedAt: Schema.optional(Format.DateTime.annotate({ description: 'When it was shared; defaults to now.' })),
    messageId: Schema.optional(Schema.String.annotate({ description: 'The `message` id in the header.' })),
    channelId: Schema.optional(Schema.String.annotate({ description: 'The `channel` id in the header.' })),
    messageLink: Schema.optional(
      Schema.String.annotate({
        description: "The message's own link (from the attachment list), filed in place of expiring attachment URLs.",
      }),
    ),
  }),
  output: Schema.Struct({
    filed: Schema.Array(FiledEntry),
    skipped: Schema.Number.annotate({ description: 'Links already in the table for this message.' }),
  }),
});

export const Period = Schema.Literals(['this-week', 'last-week', 'this-month', 'all']);
export type Period = Schema.Schema.Type<typeof Period>;

/** Reads the rows shared in a period, oldest first, with a digest grouped by author. */
export const ListLinks = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.discord.listShowAndTellLinks'),
    name: 'List shared links',
    description:
      'Lists the show-and-tell rows shared in a period ("what did we do this week?"), oldest first, with a digest grouped by author to summarize from.',
    icon: 'ph--list-magnifying-glass--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    period: Schema.optional(Period.annotate({ description: 'Defaults to this-week (weeks start Monday, UTC).' })),
    author: Schema.optional(Schema.String.annotate({ description: 'Only rows this person shared.' })),
    category: Schema.optional(ShowAndTell.Category),
  }),
  output: Schema.Struct({
    from: Schema.optional(Schema.String),
    to: Schema.optional(Schema.String),
    entries: Schema.Array(
      Schema.Struct({
        date: Schema.String,
        author: Schema.String,
        link: Schema.String,
        title: Schema.String,
        category: ShowAndTell.Category,
        summary: Schema.String,
      }),
    ),
    digest: Schema.String.annotate({ description: 'Markdown: one section per author, one line per row.' }),
  }),
});

/**
 * Switches an agent on as the curator of one Discord channel: the channel is bound and curated (every message with a
 * link or attachment wakes the agent), and the agent's own chat is put in the show-and-tell mode, whose skill each
 * conversation inherits.
 */
export const EnableShowAndTell = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.discord.enableShowAndTell'),
    name: 'Enable show-and-tell',
    description: 'Makes the agent the show-and-tell curator of a Discord channel.',
    icon: 'ph--presentation-chart--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    agent: Ref.Ref(Agent.Agent),
    channel: Ref.Ref(Channel.Channel).annotate({ description: "The agent's Discord-backed channel." }),
    discordChannelId: Schema.String.annotate({ description: 'The Discord channel id to curate.' }),
  }),
  output: Schema.Struct({
    mode: Schema.String,
    channels: Schema.Array(Schema.String),
    curate: Schema.Array(Schema.String),
    switched: Schema.Boolean.annotate({
      description: 'False when the agent has no chat yet; its conversations then start without the curator skill.',
    }),
  }),
});
