//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Participant, screenshareSuffix } from './Participant';
import { type UserState } from '../../types';

export type ParticipantGridProps = {
  identity: UserState;
  users: UserState[];
  debug: boolean;
};

export const ParticipantGrid = ({ identity, users, debug }: ParticipantGridProps) => {
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
    <div className='flex flex-col gap-1'>
      {allUsers.map((user) => (
        <Participant key={user.id} user={user} debug={debug} />
      ))}
    </div>
  );
};
