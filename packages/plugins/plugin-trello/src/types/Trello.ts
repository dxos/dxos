//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';

// @import-as-namespace

/** Trello label attached to a card. */
export const Label = Schema.Struct({
  /** Trello label ID. */
  trelloId: Schema.String,
  /** Label display name. */
  name: Schema.optional(Schema.String),
  /** Label color. */
  color: Schema.optional(Schema.String),
});

export type Label = Schema.Schema.Type<typeof Label>;

/** Trello member assigned to a card. */
export const Member = Schema.Struct({
  /** Trello member ID. */
  trelloId: Schema.String,
  /** Full name. */
  fullName: Schema.optional(Schema.String),
  /** Username. */
  username: Schema.optional(Schema.String),
  /** Avatar URL. */
  avatarUrl: Schema.optional(Schema.String),
});

export type Member = Schema.Schema.Type<typeof Member>;

/**
 * TrelloCard schema representing a card synced from Trello.
 */
export const TrelloCard = Schema.Struct({
  /** Card name/title. */
  name: Schema.String,
  /** Card description (markdown). */
  description: Schema.optional(Schema.String),
  /** Trello card ID for sync. */
  trelloCardId: Schema.String.pipe(FormInputAnnotation.set(false)),
  /** Trello board ID this card belongs to (for multi-board filtering). */
  trelloBoardId: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** Trello list ID this card belongs to. */
  trelloListId: Schema.String.pipe(FormInputAnnotation.set(false)),
  /** List name (used as pivot field for kanban grouping). */
  listName: Schema.optional(Schema.String),
  /** Card position within the list. */
  position: Schema.optional(Schema.Number.pipe(FormInputAnnotation.set(false))),
  /** Due date as ISO string. */
  dueDate: Schema.optional(Schema.String),
  /** Whether the due date is complete. */
  dueComplete: Schema.optional(Schema.Boolean),
  /** Card labels. */
  labels: Schema.optional(Schema.Array(Label).pipe(FormInputAnnotation.set(false))),
  /** Assigned members. */
  members: Schema.optional(Schema.Array(Member).pipe(FormInputAnnotation.set(false))),
  /** Card URL on Trello. */
  url: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** Whether the card is closed/archived. */
  closed: Schema.optional(Schema.Boolean.pipe(FormInputAnnotation.set(false))),
  /** Last activity timestamp from Trello. */
  lastActivityAt: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.trelloCard',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--note--regular',
    hue: 'blue',
  }),
);

export interface TrelloCard extends Schema.Schema.Type<typeof TrelloCard> {}

/** Checks if a value is a TrelloCard object. */
export const isCard = (value: unknown): value is TrelloCard => Obj.instanceOf(TrelloCard, value);

/**
 * TrelloBoard schema representing a board synced from Trello.
 */
export const TrelloBoard = Schema.Struct({
  /** Board name. */
  name: Schema.optional(Schema.String),
  /** Trello board ID for sync. */
  trelloBoardId: Schema.String.pipe(FormInputAnnotation.set(false)),
  /** Board URL on Trello. */
  url: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** Trello API key. */
  apiKey: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** Trello API token. */
  apiToken: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** Last sync timestamp. */
  lastSyncedAt: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** Polling interval in milliseconds. */
  pollIntervalMs: Schema.optional(Schema.Number),
  /** Whether the board is closed/archived. */
  closed: Schema.optional(Schema.Boolean.pipe(FormInputAnnotation.set(false))),
  /** Associated Kanban object ID for this board. */
  kanbanId: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.trelloBoard',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--columns--regular',
    hue: 'blue',
  }),
);

export interface TrelloBoard extends Schema.Schema.Type<typeof TrelloBoard> {}

/** Checks if a value is a TrelloBoard object. */
export const isBoard = (value: unknown): value is TrelloBoard => Obj.instanceOf(TrelloBoard, value);

/** Input schema for creating a TrelloBoard. */
export const CreateTrelloBoardSchema = Schema.Struct({
  trelloBoardId: Schema.String.annotations({
    title: 'Board ID',
    description: 'Trello board ID (found in the board URL).',
  }),
  apiKey: Schema.String.annotations({
    title: 'API Key',
    description: 'Trello API key from https://trello.com/power-ups/admin.',
  }),
  apiToken: Schema.String.annotations({
    title: 'API Token',
    description: 'Trello API token generated for the API key.',
  }),
});

export interface CreateTrelloBoardSchema extends Schema.Schema.Type<typeof CreateTrelloBoardSchema> {}

/** Creates a TrelloBoard object. */
export const makeBoard = (props: CreateTrelloBoardSchema): TrelloBoard => {
  return Obj.make(TrelloBoard, {
    name: 'Trello Board',
    trelloBoardId: props.trelloBoardId,
    apiKey: props.apiKey,
    apiToken: props.apiToken,
    pollIntervalMs: 30_000,
  });
};

/** Creates a TrelloCard object. */
export const makeCard = (props: Omit<Obj.MakeProps<typeof TrelloCard>, 'id'>): TrelloCard => {
  return Obj.make(TrelloCard, props);
};
