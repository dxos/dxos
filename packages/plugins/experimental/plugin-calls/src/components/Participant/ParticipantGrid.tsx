//
// Copyright 2025 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { Participant, screenshareSuffix } from './Participant';
import { type UserState } from '../../types';
import { Grid } from '../Grid';

export type ParticipantGridProps = {
  identity: UserState;
  users: UserState[];
  debug: boolean;
};

export const ParticipantGrid = ({ identity, users, debug }: ParticipantGridProps) => {
  const [expanded, setExpanded] = useState<UserState | undefined>();
  const allUsers = useMemo(
    () =>
      (identity ? [identity] : []).concat(users.filter((user) => user.joined)).flatMap((user) => {
        if (user.tracks?.screenshareEnabled) {
          const screenshare = {
            ...user,
            id: user.id + screenshareSuffix,
            tracks: {
              ...user.tracks,
              video: user.tracks!.screenshare,
              videoEnabled: user.tracks!.screenshareEnabled,
            },
          };
          return [user, screenshare];
        }

        return [user];
      }),
    [identity, users],
  ) as UserState[];

  // TODO(burdon): If only 2 users then expand other.
  let showExpanded = expanded;
  if (allUsers.length === 2) {
    showExpanded = allUsers.find((user) => user.id !== identity?.id);
  }

  const filteredItems = allUsers.filter((item) => item.id !== showExpanded?.id);

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
