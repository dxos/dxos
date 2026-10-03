//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Actor } from '@dxos/types';

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
            'An assignee must be a contact (`contact`), a space member (`identityDid`), or an agent session ' +
            '(`subject`, or pass `remoteSession`); a name or email alone does not identify anyone.',
        }),
      );
