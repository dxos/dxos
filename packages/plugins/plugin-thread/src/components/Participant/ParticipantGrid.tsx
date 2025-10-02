//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';

import { type UserState } from '../../calls';
import { ResponsiveGrid } from '../ResponsiveGrid';

import { Participant, SCREENSHARE_SUFFIX } from './Participant';

const getId = (user: UserState): string => user.id!;

export type ParticipantGridProps = ThemedClassName<{
  self: UserState;
  users: UserState[];
  fullscreen?: boolean;
  debug?: boolean;
}>;

export const ParticipantGrid = ({ classNames, self, users, fullscreen, debug }: ParticipantGridProps) => {
  const [pinned, setPinned] = useState<string | undefined>();

  const allUsers = useMemo(() => {
    const allUsers: (UserState & { isSelf?: boolean })[] = [];
    users.forEach((user) => {
      if (!user.joined) {
        return;
      }

      allUsers.push({ ...user, isSelf: user.id === self.id });
      if (user.tracks?.screenshareEnabled) {
        const screenshare: UserState = {
          ...user,
          id: user.id + SCREENSHARE_SUFFIX,
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

  useEffect(() => {
    if (pinned) {
      // Check expanded user is still in call.
      if (!allUsers.find((user) => user.id === pinned)) {
        setPinned(undefined);
      }
    }
  }, [pinned, allUsers]);

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

  // TODO(burdon): Show ghost view of user for a second before leaving.
  return (
    <ResponsiveGrid<UserState>
      classNames={classNames}
      Cell={Participant}
      debug={debug}
      getId={getId}
      items={sortedUsers}
      pinned={pinned}
      autoHideGallery={fullscreen}
      onPinnedChange={setPinned}
    />
  );
};
