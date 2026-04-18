//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { AccessToken } from '@dxos/types';

// @import-as-namespace

// TODO(richburdon): Labels should map to Composer's cross-cutting Tag type
//   (`org.dxos.type.tag`). Requires defining a 2-way mapping between Trello
//   label colors and Composer tag hues. Tracked separately.

/** Trello label attached to a card. */
export const Label = Schema.Struct({
  /** Trello label ID (for round-trip sync). */
  trelloId: Schema.optional(Schema.String),
  name: Schema.optional(Schema.String),
  color: Schema.optional(Schema.String),
});

export type Label = Schema.Schema.Type<typeof Label>;

/** Trello member assigned to a card. */
export const Member = Schema.Struct({
  /** Trello member ID (for round-trip sync). */
  trelloId: Schema.optional(Schema.String),
  fullName: Schema.optional(Schema.String),
  username: Schema.optional(Schema.String),
  avatarUrl: Schema.optional(Schema.String),
});

export type Member = Schema.Schema.Type<typeof Member>;

/**
 * TrelloCard synced from Trello.
 *
 * External identity is tracked via `Obj.Meta` foreignKeys
 * (`{ source: 'trello.com', id: <trelloCardId> }`), not custom fields.
 * The list ID and name are kept as regular fields because they drive
 * Kanban column grouping.
 */
export const TrelloCard = Schema.Struct({
  name: Schema.String,
  description: Schema.optional(Schema.String),
  /** List ID on Trello (drives Kanban grouping). */
  trelloListId: Schema.String.pipe(FormInputAnnotation.set(false)),
  /** List name (pivot field for Kanban columns). */
  listName: Schema.optional(Schema.String),
  position: Schema.optional(Schema.Number.pipe(FormInputAnnotation.set(false))),
  dueDate: Schema.optional(Schema.String),
  dueComplete: Schema.optional(Schema.Boolean),
  labels: Schema.optional(Schema.Array(Label).pipe(FormInputAnnotation.set(false))),
  members: Schema.optional(Schema.Array(Member).pipe(FormInputAnnotation.set(false))),
  url: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  closed: Schema.optional(Schema.Boolean.pipe(FormInputAnnotation.set(false))),
  lastActivityAt: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.trelloCard',
    version: '0.2.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--note--regular',
    hue: 'blue',
  }),
);

export interface TrelloCard extends Schema.Schema.Type<typeof TrelloCard> {}

export const isCard = (value: unknown): value is TrelloCard => Obj.instanceOf(TrelloCard, value);

/**
 * TrelloBoard synced from Trello.
 *
 * External identity tracked via `Obj.Meta` foreignKeys
 * (`{ source: 'trello.com', id: <trelloBoardId> }`).
 * Credentials stored as an `AccessToken` reference, not inline.
 */
export const TrelloBoard = Schema.Struct({
  name: Schema.optional(Schema.String),
  url: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  /** Trello API credentials (key + token stored as AccessToken). */
  accessToken: Schema.optional(
    Ref.Ref(AccessToken.AccessToken).annotations({
      title: 'Trello credentials',
      description: 'API key and token for syncing this board.',
    }),
  ),
  lastSyncedAt: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
  pollIntervalMs: Schema.optional(Schema.Number),
  closed: Schema.optional(Schema.Boolean.pipe(FormInputAnnotation.set(false))),
  /** Associated Kanban object ID. */
  kanbanId: Schema.optional(Schema.String.pipe(FormInputAnnotation.set(false))),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.trelloBoard',
    version: '0.2.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--columns--regular',
    hue: 'blue',
  }),
);

export interface TrelloBoard extends Schema.Schema.Type<typeof TrelloBoard> {}

export const isBoard = (value: unknown): value is TrelloBoard => Obj.instanceOf(TrelloBoard, value);

/** Input schema for creating a TrelloBoard via the Create menu. */
export const CreateTrelloBoardSchema = Schema.Struct({
  name: Schema.optional(
    Schema.String.annotations({
      title: 'Name',
      description: 'Display name for the board.',
    }),
  ),
});

export interface CreateTrelloBoardSchema extends Schema.Schema.Type<typeof CreateTrelloBoardSchema> {}

/** Creates a TrelloBoard object with foreignKey for the Trello board ID. */
export const makeBoard = (props: { name?: string; trelloBoardId: string }): TrelloBoard => {
  return Obj.make(TrelloBoard, {
    [Obj.Meta]: {
      keys: [{ id: props.trelloBoardId, source: 'trello.com' }],
    },
    name: props.name ?? 'Trello Board',
    pollIntervalMs: 30_000,
  });
};

/** Creates a TrelloCard object with foreignKey for the Trello card ID. */
export const makeCard = (props: {
  trelloCardId: string;
  name: string;
  description?: string;
  trelloListId: string;
  listName?: string;
  position?: number;
  url?: string;
  closed?: boolean;
  lastActivityAt?: string;
  labels?: Label[];
  members?: Member[];
}): TrelloCard => {
  const { trelloCardId, ...rest } = props;
  return Obj.make(TrelloCard, {
    [Obj.Meta]: {
      keys: [{ id: trelloCardId, source: 'trello.com' }],
    },
    ...rest,
  });
};

// ── Foreign key helpers ─────────────────────────────────────────────────────

const TRELLO_SOURCE = 'trello.com';

/** Extract the Trello ID from an object's foreignKeys. */
export const getTrelloId = (obj: Obj.Any): string | undefined => {
  const meta = Obj.getMeta(obj);
  return meta.keys?.find((key: { source: string; id: string }) => key.source === TRELLO_SOURCE)?.id;
};

/** Extract the Trello board ID (alias for getTrelloId). */
export const getTrelloBoardId = getTrelloId;

/** Extract the Trello card ID (alias for getTrelloId). */
export const getTrelloCardId = getTrelloId;

/** Check if an object has a specific Trello foreign key. */
export const hasTrelloId = (obj: Obj.Any, trelloId: string): boolean => {
  return getTrelloId(obj) === trelloId;
};
