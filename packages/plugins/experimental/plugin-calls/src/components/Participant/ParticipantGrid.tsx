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
      (identity ? [identity] : []).concat(users.filter((user) => user.joined)).flatMap((user) =>
        user.tracks?.screenShareEnabled
          ? [
              user,
              {
                ...user,
                id: user.id + screenshareSuffix,
                tracks: {
                  ...user.tracks,
                  video: user.tracks!.screenshare,
                  videoEnabled: user.tracks!.screenShareEnabled,
                },
              },
            ]
          : [user],
      ),
    [identity, users],
  ) as UserState[];

  return (
    <Grid<UserState> Cell={Participant} debug={debug} items={allUsers} expanded={expanded} onExpand={setExpanded} />
  );
};
