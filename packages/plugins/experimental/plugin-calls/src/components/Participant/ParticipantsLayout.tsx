//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';
import useMeasure from 'react-use/lib/useMeasure';

import { Participant, screenshareSuffix } from './Participant';
import { type UserState } from '../../types';
import { calculateLayout } from '../../utils';

export const ParticipantsLayout = ({
  self,
  users,
  debugEnabled,
}: {
  self: UserState;
  users: UserState[];
  debugEnabled: boolean;
}) => {
  const usersAndScreenShares = useMemo(
    () =>
      (self ? [self] : []).concat(users).flatMap((u) =>
        u.tracks?.screenShareEnabled
          ? [
              u,
              {
                ...u,
                id: u.id + screenshareSuffix,
                tracks: {
                  ...u.tracks,
                  video: u.tracks!.screenshare,
                  videoEnabled: u.tracks!.screenShareEnabled,
                },
              },
            ]
          : [u],
      ),
    [self, users],
  );

  const [containerRef, { width: containerWidth, height: containerHeight }] = useMeasure<HTMLDivElement>();
  const [firstFlexChildRef, { width: firstFlexChildWidth }] = useMeasure<HTMLDivElement>();
  const flexContainerWidth = useMemo(
    () =>
      100 /
        calculateLayout({
          count: usersAndScreenShares.filter((user) => user.joined).length,
          height: containerHeight,
          width: containerWidth,
        }).cols +
      '%',
    [containerHeight, containerWidth, usersAndScreenShares.length],
  );

  if (usersAndScreenShares.length === 0) {
    return null;
  }

  return (
    <div
      className='absolute inset-0 flex flex-wrap justify-around gap-[--gap] overflow-hidden'
      style={
        {
          // the flex basis that is needed to achieve row layout
          '--flex-container-width': flexContainerWidth,
          // the size of the first user's flex container
          '--participant-max-width': firstFlexChildWidth + 'px',
          '--gap': '1rem',
        } as any
      }
      ref={containerRef}
    >
      {usersAndScreenShares
        .filter((user) => user.joined)
        .map((user, i) => (
          <Participant
            key={user.id}
            user={user as UserState}
            showDebugInfo={debugEnabled}
            ref={i === 0 ? firstFlexChildRef : undefined}
          />
        ))}
    </div>
  );
};
