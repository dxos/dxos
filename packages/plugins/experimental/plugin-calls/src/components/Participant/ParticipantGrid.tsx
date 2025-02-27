//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { Participant } from './Participant';
import { type UserState } from '../../types';
import { ResponsiveGrid } from '../ResponsiveGrid';

const getId = (user: UserState): string => user.id!;

export type ParticipantGridProps = {
  user: UserState;
  users: UserState[];
  debug: boolean;
};

export const ParticipantGrid = ({ user: self, users, debug }: ParticipantGridProps) => {
  const allUsers = useMemo(() => {
    const allUsers: UserState[] = [];
    users.forEach((user) => {
      if (!user.joined) {
        return;
      }

      allUsers.push(user);
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
  }, [self, users]) as UserState[];

  const [pinned, setPinned] = useState<string | undefined>();
  useEffect(() => {
    if (pinned) {
      // Check expanded user is still in call.
      if (!allUsers.find((user) => user.id === pinned)) {
        setPinned(undefined);
      }
    }
  }, [pinned, allUsers]);

  // TODO(burdon): Auto expand if screenshare is enabled.
  // TODO(burdon): Auto expand when second user joins call?

  // Filter out currently expanded and sort screenshare first.
  // TODO(burdon): Put self last.
  const sortedUsers: UserState[] = allUsers.sort((a, b) => {
    if (a.self) {
      return 1;
    } else if (b.self) {
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
