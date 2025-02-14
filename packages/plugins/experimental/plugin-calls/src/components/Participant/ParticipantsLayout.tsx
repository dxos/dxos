//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';
import useMeasure from 'react-use/lib/useMeasure';

import { Button, Dialog, Icon } from '@dxos/react-ui';

import { Participant, screenshareSuffix } from './Participant';
import { type UserState } from '../../types';
import { calculateLayout } from '../../utils';

const usePinnedParticipant = (users: UserState[]) => {
  const [pinnedParticipant, setPinnedParticipant] = useState<UserState>();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPinnedParticipant(undefined);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setPinnedParticipant]);

  useEffect(() => {
    const participant = users.find((user) => user.id === pinnedParticipant?.id);
    setPinnedParticipant(participant);
  }, [users]);
  return {
    pinnedParticipant,
    setPinnedParticipant: (id?: string) => {
      const participant = id ? users.find((user) => user.id === id) : undefined;
      setPinnedParticipant(participant);
    },
  };
};

export const ParticipantsLayout = ({
  identity,
  users,
  debugEnabled,
}: {
  identity: UserState;
  users: UserState[];
  debugEnabled: boolean;
}) => {
  const usersAndScreenShares = useMemo(
    () =>
      (identity ? [identity] : []).concat(users.filter((user) => user.joined)).flatMap((u) =>
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
    [identity, users],
  ) as UserState[];

  const [containerRef, { width: containerWidth, height: containerHeight }] = useMeasure<HTMLDivElement>();
  const [firstFlexChildRef, { width: firstFlexChildWidth }] = useMeasure<HTMLDivElement>();
  const { pinnedParticipant, setPinnedParticipant } = usePinnedParticipant(usersAndScreenShares);
  const flexContainerWidth = useMemo(
    () =>
      100 /
        calculateLayout({
          count: usersAndScreenShares.length,
          height: containerHeight,
          width: containerWidth,
        }).cols +
      '%',
    [containerHeight, containerWidth, usersAndScreenShares.length],
  );

  if (usersAndScreenShares.length === 0) {
    return null;
  }

  return pinnedParticipant ? (
    <Dialog.Root defaultOpen onOpenChange={() => setPinnedParticipant()}>
      <Dialog.Content classNames='!p-0 !rounded-none !border-0 !max-bs-[90vh] !max-is-[90vw] !h-full !w-full'>
        <div role='none' className='flex h-full w-full relative'>
          <div className='absolute top-2 right-2 z-10'>
            <Dialog.Close asChild>
              <Button variant='destructive' autoFocus onClick={() => setPinnedParticipant()}>
                <Icon icon='ph--x--regular' size={4} />
              </Button>
            </Dialog.Close>
          </div>
          <Participant
            user={pinnedParticipant}
            showDebugInfo={debugEnabled}
            pinnedParticipant={pinnedParticipant}
            setPinnedParticipant={setPinnedParticipant}
          />
        </div>
      </Dialog.Content>
    </Dialog.Root>
  ) : (
    <div
      className='absolute inset-0 flex flex-wrap justify-around gap-[--gap] overflow-hidden'
      style={
        {
          // the flex basis that is needed to achieve row layout
          '--flex-container-width': flexContainerWidth,
          // the size of the first user's flex container
          '--participant-max-width': firstFlexChildWidth + 'px',
          '--gap': '0.3rem',
        } as any
      }
      ref={containerRef}
    >
      {usersAndScreenShares.map((user, i) => (
        <Participant
          key={user.id}
          user={user as UserState}
          showDebugInfo={debugEnabled}
          pinnedParticipant={pinnedParticipant}
          setPinnedParticipant={setPinnedParticipant}
          ref={i === 0 ? firstFlexChildRef : undefined}
        />
      ))}
    </div>
  );
};
