//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { generateName } from '@dxos/display-name';
import { useMembers } from '@dxos/halo-react';
import { type SpaceId } from '@dxos/keys';
import { type TaskMember } from '@dxos/react-ui-task';

/** Everyone in the space, the owner included, as the assignees a task picker offers by identity. */
export const useTaskMembers = (spaceId: SpaceId | undefined): readonly TaskMember[] => {
  const members = useMembers(spaceId);
  return useMemo(
    () =>
      members.flatMap((member) =>
        member.did
          ? [
              {
                did: member.did,
                // A member with no profile name gets the generated one the rest of the app shows for it.
                name: member.displayName ?? (member.identityKey ? generateName(member.identityKey) : undefined),
              },
            ]
          : [],
      ),
    [members],
  );
};
