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
          } as any // TODO(burdon): Remove cast.
        };

        allUsers.push(screenshare);
      }
    });

    return allUsers;
  }, [self, users]) as UserState[];

  const [expanded, setExpanded] = useState<UserState | undefined>();
  useEffect(() => {
    // Check exists.
    if (expanded) {
      if (!allUsers.find((user) => user.id === expanded?.id)) {
        setExpanded(undefined);
      }
    }
  }, [expanded, allUsers]);

  let showExpanded = expanded;

  // If only 2 users then expand other.
  if (allUsers.length === 2) {
    showExpanded = allUsers.find((user) => user.id !== self?.id);
  }

  // Filter out currently expanded and sort screenshare first.
  const filteredItems = allUsers
    .filter((item) => item.id !== showExpanded?.id);
    // .sort((a, b) => (a.tracks?.screenshareEnabled ? -1 : 1)); // TODO(burdon): ???

  return (
    <Grid<UserState>
      Cell={Participant}
      debug={debug}
      items={filteredItems}
      expanded={showExpanded}
      onExpand={setExpanded}
    />
  );
};
