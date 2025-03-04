//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { Participant } from './Participant';
import { type UserState } from '../../types';
import { ResponsiveGrid } from '../ResponsiveGrid';
import { log } from '@dxos/log';

const getId = (user: UserState): string => user.id!;

export type ParticipantGridProps = {
  self: UserState;
  users: UserState[];
  debug: boolean;
};

export const ParticipantGrid = ({ self, users, debug }: ParticipantGridProps) => {
  const allUsers = useMemo(() => {
    const allUsers: (UserState & { isSelf?: boolean })[] = [];
    users.forEach((user) => {
      if (!user.joined) {
        return;
      }

      allUsers.push(user, { isSelf: user.id === self.id });
      if (user.tracks?.screenshareEnabled) {
        const screenshare: UserState = {
          ...user,
          id: user.id + '_screenshare',
          tracks: {
            ...user.tracks,
            video: user.tracks.screenshare,
            videoEnabled: user.tracks.screenshareEnabled,
          } as any, // TODO(burdon): Remove cast.
        };

        allUsers.push(screenshare);
      }
    });

    return allUsers;
  }, [self, users]);

  const [pinned, setPinned] = useState<string | undefined>();
  useEffect(() => {
    log.info('pinned', { pinned, allUsers });
    if (pinned) {
      // Check expanded user is still in call.
      if (!allUsers.find((user) => user.id === pinned)) {
        setPinned(undefined);
      }
    }
  }, [pinned, allUsers]);

  // TODO(burdon): Show ghost view of user for a second before leaving.

  // TODO(burdon): Put self last.
  const sortedUsers: UserState[] = allUsers.sort((a, b) => {
    if (a.isSelf) {
      return 1;
    } else if (b.isSelf) {
      return -1;
    } else if (a.tracks?.screenshareEnabled) {
      return -1;
    } else if (b.tracks?.screenshareEnabled) {
      return 1;
    } else {
      return 0;
    }
  });

  return (
    <ResponsiveGrid<UserState>
      Cell={Participant}
      debug={debug}
      getId={getId}
      items={sortedUsers}
      pinned={pinned}
      onPinnedChange={setPinned}
    />
  );
};
