//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { Participant } from './Participant';
import { type UserState } from '../../types';
import { Grid } from '../Grid';

export type ParticipantGridProps = {
  user: UserState;
  users: UserState[];
  debug: boolean;
};

export const ParticipantGrid = ({ user: self, users, debug }: ParticipantGridProps) => {
  const allUsers = useMemo(() => {
    const allUsers: UserState[] = self ? [self] : [];
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

  const [expanded, setExpanded] = useState<UserState | undefined>();
  useEffect(() => {
    if (expanded) {
      // Check expanded user is still in call.
      if (!allUsers.find((user) => user.id === expanded?.id)) {
        setExpanded(undefined);
      }
    }
  }, [expanded, allUsers]);

  // TODO(burdon): Auto expand if screenshare is enabled.
  // TODO(burdon): Auto expand when second user joins call?

  // Filter out currently expanded and sort screenshare first.
  // TODO(burdon): Put self last.
  const filteredItems = allUsers
    .filter((user) => user.id !== expanded?.id)
    .sort((a, b) => {
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
    <Grid<UserState>
      Cell={Participant}
      debug={debug}
      items={filteredItems}
      expanded={expanded}
      onExpand={setExpanded}
    />
  );
};
