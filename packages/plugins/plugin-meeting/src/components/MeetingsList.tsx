//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { Common } from '@dxos/app-framework';
import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/react';
import { Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceOperation } from '@dxos/plugin-space/types';
import { type Channel } from '@dxos/plugin-thread/types';
import { Query, useQuery } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';
import { ghostHover, mx } from '@dxos/ui-theme';

import { meta } from '../meta';
import { Meeting, MeetingOperation } from '../types';

// TODO(wittjosiah): Add a story which renders meetings alongside call?

const grid = 'grid grid-cols-[1fr_auto] min-bs-[2.5rem]';

const MeetingItem = ({
  meeting,
  getLabel,
}: {
  meeting: Meeting.Meeting;
  getLabel: (meeting: Meeting.Meeting) => string;
}) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  const handleSelectMeeting = useCallback(
    () => invokePromise(MeetingOperation.SetActive, { object: meeting }),
    [invokePromise, meeting],
  );

  return (
    <List.Item<Meeting.Meeting>
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

export type MeetingsListProps = {
  channel: Channel.Channel;
};

export const MeetingsList = ({ channel }: MeetingsListProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const db = Obj.getDatabase(channel);
  const meetings = useQuery(db, Query.type(Meeting.Meeting));
  // TODO(wittjosiah): This should be done in the query.
  const sortedMeetings = useMemo(() => {
    return meetings.toSorted((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
  }, [meetings]);

  const metadata = useCapabilities(Common.Capability.Metadata);
  const [meetingMetadata] = useMemo(
    () =>
      metadata
        .filter(
          (
            capability,
          ): capability is {
            id: string;
            metadata: { label: (object: any) => string; icon: string };
          } => capability.id === Type.getTypename(Meeting.Meeting),
        )
        .map((c) => c.metadata),
    [metadata],
  );

  const getId = useCallback((meeting: Meeting.Meeting) => meeting.id, []);
  const handleCreateMeeting = useCallback(async () => {
    invariant(db);
    const createResult = await invokePromise(MeetingOperation.Create, { channel });
    const addResult = await invokePromise(SpaceOperation.AddObject, {
      target: db,
      hidden: true,
      object: createResult.data?.object,
    });
    await invokePromise(MeetingOperation.SetActive, { object: addResult.data?.object });
  }, [invokePromise, db, channel]);

  return (
    <div>
      <div className='pli-2 min-bs-[3rem] flex justify-end items-center'>
        <Button onClick={handleCreateMeeting}>{t('create meeting label')}</Button>
      </div>
      <List.Root<Meeting.Meeting> items={sortedMeetings} isItem={Schema.is(Meeting.Meeting)} getId={getId}>
        {({ items }) => (
          <div role='list' className='flex flex-col is-full'>
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
