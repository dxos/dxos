//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Actor, Task } from '@dxos/types';

import { InvalidOperationInput } from '../errors.ts';

/**
 * Fails unless the actor names someone the space can resolve: a contact, a member's identity, or
 * the agent session it stands for. A bare name or email reads as a person in the list while
 * pointing at nobody, so the task shows an owner who can never be reached or filtered on.
 */
export const validateAssignee = (
  assignee: Actor.Actor | null | undefined,
): Effect.Effect<void, InvalidOperationInput> =>
  !assignee || assignee.contact || assignee.identityDid || assignee.subject
    ? Effect.void
    : Effect.fail(
        new InvalidOperationInput({
          message:
            'An assignee or delegate must be a contact (`contact`), a space member (`identityDid`), or an agent session ' +
            '(`subject`, or pass `remoteSession`); a name or email alone does not identify anyone.',
        }),
      );

export const validateDelegate = (
  delegate: Actor.Actor | null | undefined,
  assignee?: Actor.Actor,
): Effect.Effect<void, InvalidOperationInput> =>
  !delegate || delegate.role === 'assistant' || Task.sameActor(delegate, assignee)
    ? validateAssignee(delegate)
    : Effect.fail(
        new InvalidOperationInput({
          message: 'A delegate must be an agent (`role: "assistant"`); name a person as the `assignee` instead.',
        }),
      );

export const requireOwner = (
  title: string,
  owner: Actor.Actor | undefined,
): Effect.Effect<void, InvalidOperationInput> =>
  owner
    ? Effect.void
    : Effect.fail(
        new InvalidOperationInput({
          message:
            `"${title}" has no person as its assignee. Pass \`assignee: { identityDid, name }\` ` +
            'with the identityDid and displayName that `whoami` returns: the session is the delegate, ' +
            'working for them.',
        }),
      );
