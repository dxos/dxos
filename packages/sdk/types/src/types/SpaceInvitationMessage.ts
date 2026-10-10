//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import type * as Actor from './Actor.ts';
import type * as ContentBlock from './ContentBlock.ts';
import * as Message from './Message.ts';

/**
 * Surface role of the block that tells a recipient they have been admitted to a space.
 * It is a surface rather than an attachment `ref` because there is no object to resolve until the recipient joins.
 */
export const SPACE_INVITATION_ROLE = 'org.dxos.role.spaceInvitation';

/**
 * Data of the {@link SPACE_INVITATION_ROLE} surface block.
 */
export const Data = Schema.Struct({
  /** Hex-encoded space key. */
  spaceKey: Schema.String,
  /** A `dxos.halo.credentials.SpaceMember.Role` value; kept numeric so this package need not depend on protocols. */
  role: Schema.Number,
  /** Known to the sender, who is a member; the recipient cannot read it until they join. */
  spaceName: Schema.optional(Schema.String),
});

export interface Data extends Schema.Schema.Type<typeof Data> {}

export type MakeProps = Data & {
  sender: Actor.Actor;
  /** Defaults to now. */
  created?: Date;
};

/**
 * Builds the message that tells its recipient they have been admitted to a space; a text block
 * describes the invitation to clients that do not render the surface.
 */
export const make = ({ sender, spaceKey, role, spaceName, created }: MakeProps): Message.Message =>
  Message.make({
    created: created?.toISOString(),
    sender,
    blocks: [
      {
        _tag: 'surface',
        role: SPACE_INVITATION_ROLE,
        data: { spaceKey, role, ...(spaceName ? { spaceName } : {}) },
      },
      {
        _tag: 'text',
        text: spaceName
          ? `You have been invited to join the space "${spaceName}".`
          : 'You have been invited to join a space.',
      },
    ],
    properties: { subject: spaceName ? `Invitation to ${spaceName}` : 'Space invitation' },
  });

const decodeData = Schema.decodeUnknownOption(Data);

/**
 * Reads the invitation back from a message, if it is one.
 */
export const match = (message: { readonly blocks?: readonly ContentBlock.Any[] }): Option.Option<Data> =>
  Option.fromNullishOr(
    message.blocks?.find(
      (block): block is ContentBlock.Surface => block._tag === 'surface' && block.role === SPACE_INVITATION_ROLE,
    ),
  ).pipe(Option.flatMap((block) => decodeData(block.data)));
