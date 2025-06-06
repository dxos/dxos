//
// Copyright 2025 DXOS.org
//

import { pipe, Schema } from 'effect';
import React, { useCallback, useMemo } from 'react';

import { Capabilities, chain, createIntent, useCapabilities, useIntentDispatcher } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { SpaceAction } from '@dxos/plugin-space/types';
import { type ChannelType } from '@dxos/plugin-thread/types';
import { getSpace, Query, useQuery } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';
import { ghostHover, mx } from '@dxos/react-ui-theme';

import { MEETING_PLUGIN } from '../meta';
import { MeetingAction, MeetingType } from '../types';

// TODO(wittjosiah): Add a story which renders meetings alongside call?

const grid = 'grid grid-cols-[1fr_auto] min-bs-[2.5rem]';

const MeetingItem = ({ meeting, getLabel }: { meeting: MeetingType; getLabel: (meeting: MeetingType) => string }) => {
  const { t } = useTranslation(MEETING_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const handleSelectMeeting = useCallback(
    () => dispatch(createIntent(MeetingAction.SetActive, { object: meeting })),
    [dispatch, meeting],
  );

  return (
    <List.Item<MeetingType>
      key={meeting.id}
      item={meeting}
      classNames={mx(grid, ghostHover, 'items-center', 'pli-2', 'min-bs-[3rem]')}
    >
      <div className='flex flex-col truncate'>
        <List.ItemTitle classNames='truncate'>{getLabel(meeting)}</List.ItemTitle>
      </div>
      <Button onClick={handleSelectMeeting}>{t('select meeting label')}</Button>
    </List.Item>
  );
};

export const MeetingsList = ({ channel }: { channel: ChannelType }) => {
  const { t } = useTranslation(MEETING_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const space = getSpace(channel);
  const meetings = useQuery(space, Query.type(MeetingType));
  // TODO(wittjosiah): This should be done in the query.
  const sortedMeetings = useMemo(() => {
    return meetings.toSorted((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
  }, [meetings]);

  const metadata = useCapabilities(Capabilities.Metadata);
  const [meetingMetadata] = useMemo(
    () =>
      metadata
        .filter(
          (capability): capability is { id: string; metadata: { label: (object: any) => string; icon: string } } =>
            capability.id === MeetingType.typename,
        )
        .map((c) => c.metadata),
    [metadata],
  );

  const getId = useCallback((meeting: MeetingType) => meeting.id, []);
  const handleCreateMeeting = useCallback(async () => {
    invariant(space);
    const intent = pipe(
      createIntent(MeetingAction.Create, { channel }),
      chain(SpaceAction.AddObject, { target: space, hidden: true }),
      chain(MeetingAction.SetActive),
    );
    await dispatch(intent);
  }, [dispatch, space]);

  return (
    <div>
      <div className='pli-2 min-bs-[3rem] flex justify-end items-center'>
        <Button onClick={handleCreateMeeting}>{t('create meeting label')}</Button>
      </div>
      <List.Root<MeetingType> items={sortedMeetings} isItem={Schema.is(MeetingType)} getId={getId}>
        {({ items }) => (
          <div role='list' className='flex flex-col w-full'>
            {items?.map((meeting) => (
              <MeetingItem key={meeting.id} meeting={meeting} getLabel={meetingMetadata.label} />
            ))}
          </div>
        )}
      </List.Root>
    </div>
  );
};

export default MeetingsList;
