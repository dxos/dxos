//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Obj, Type } from '@dxos/echo';
import { BaseError } from '@dxos/errors';

//
// Show-and-tell: a Discord channel the team drops demos and links into, which an agent files as one row per link.
//

/** Key of the curator skill; a plain key so the mode that binds it need not import the skill. */
export const SKILL_KEY = 'org.dxos.skill.discord.showAndTell';

/** Name of the agent mode that binds the curator skill. */
export const MODE_NAME = 'Show-and-tell';

/** `@meta.keys` source of an entry: one per (message, link), so a redelivered message files nothing twice. */
export const ENTRY_SOURCE = 'org.dxos.showAndTell';

/** What a shared link is; the curator picks one, and {@link categorize} gives the default. */
export const Category = Schema.Literals(['demo', 'video', 'design', 'code', 'doc', 'article', 'other']);
export type Category = Schema.Schema.Type<typeof Category>;

export const CATEGORIES: readonly Category[] = Category.literals;

/** One shared link: a row of the show-and-tell table. */
export class Entry extends Type.makeObject<Entry>(DXN.make('org.dxos.type.discord.showAndTellEntry', '0.1.0'))(
  Schema.Struct({
    date: Format.DateTime.annotate({ title: 'Date', description: 'When the link was shared.' }),
    author: Schema.String.annotate({ title: 'Author', description: 'Who shared it.' }),
    link: Schema.String.annotate({ title: 'Link' }),
    title: Schema.String.annotate({ title: 'Title' }),
    category: Category.annotate({ title: 'Category' }),
    summary: Schema.String.annotate({ title: 'Summary', description: 'One line on what it shows.' }),
    messageId: Schema.optional(Schema.String.annotate({ title: 'Message', description: 'The Discord message id.' })),
    channelId: Schema.optional(Schema.String.annotate({ title: 'Channel', description: 'The Discord channel id.' })),
  }).pipe(
    Annotation.LabelAnnotation.set(['title']),
    Annotation.IconAnnotation.set({ icon: 'ph--presentation-chart--regular', hue: 'amber' }),
  ),
) {}

export const instanceOf = (value: unknown): value is Entry => Obj.instanceOf(Entry, value);

/** The foreign key an entry carries: the message it was shared in and its link, or the link alone. */
export const entryKey = ({ messageId, link }: { messageId?: string; link: string }) => ({
  source: ENTRY_SOURCE,
  id: messageId ? `${messageId}/${link}` : link,
});

/** Creates an entry keyed by {@link entryKey}. */
export const make = (props: Obj.MakeProps<typeof Entry>): Entry =>
  Obj.make(Entry, { [Obj.Meta]: { keys: [entryKey(props)] }, ...props });

/** Show-and-tell could not be set up; the message says what to fix. */
export class ShowAndTellError extends BaseError.extend('ShowAndTellError', 'Show-and-tell setup failed.') {}
