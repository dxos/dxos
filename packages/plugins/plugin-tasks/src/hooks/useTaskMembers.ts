//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { generateName } from '@dxos/display-name';
import { useMembers } from '@dxos/halo-react';
import { type SpaceId } from '@dxos/keys';
import { type TaskMember } from '@dxos/react-ui-task';

export const useTaskMembers = (spaceId: SpaceId | undefined): readonly TaskMember[] => {
  const members = useMembers(spaceId);
  return useMemo(
    () =>
      members.flatMap((member) =>
        member.did
          ? [
              {
                did: member.did,
                name: member.displayName ?? (member.identityKey ? generateName(member.identityKey) : undefined),
              },
            ]
          : [],
      ),
    [members],
  );
};
