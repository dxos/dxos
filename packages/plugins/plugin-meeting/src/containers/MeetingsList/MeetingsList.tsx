//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { Channel } from '@dxos/plugin-thread/types';
import { Query, useQuery } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';
import { Row, RowList } from '@dxos/react-ui-list';

import { meta } from '#meta';
import { MeetingOperation } from '#operations';
import { Meeting } from '#types';

// TODO(wittjosiah): Add a story which renders meetings alongside call?

type MeetingItemProps = {
  meeting: Meeting.Meeting;
  getLabel: (meeting: Meeting.Meeting) => string;
};

const MeetingItem = ({ meeting, getLabel }: MeetingItemProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();

  const handleSelectMeeting = useCallback(
    () => invokePromise(MeetingOperation.SetActive, { object: meeting }),
    [invokePromise, meeting],
  );

  return (
    <Row id={meeting.id} classNames='grid grid-cols-[1fr_auto] items-center'>
      <span className='truncate'>{getLabel(meeting)}</span>
      <Button onClick={handleSelectMeeting}>{t('select-meeting.label')}</Button>
    </Row>
  );
};

export type MeetingsListProps = AppSurface.ArticleProps<undefined, {}, Obj.Unknown>;

export const MeetingsList = ({ companionTo: channel }: MeetingsListProps) => {
  const { t } = useTranslation(meta.id);
  const { invokePromise } = useOperationInvoker();
  const db = Obj.getDatabase(channel);
  const meetings = useQuery(db, Query.type(Meeting.Meeting));
  // TODO(wittjosiah): This should be done in the query.
  const sortedMeetings = useMemo(() => {
    return meetings.toSorted((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
  }, [meetings]);

  const metadata = useCapabilities(AppCapabilities.Metadata);
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

  const handleCreateMeeting = useCallback(async () => {
    invariant(db);
    const createResult = await invokePromise(MeetingOperation.Create, { channel: channel as Channel.Channel });
    invariant(Obj.instanceOf(Meeting.Meeting, createResult.data?.object));
    const addResult = await invokePromise(SpaceOperation.AddObject, {
      target: db,
      hidden: true,
      object: createResult.data?.object,
    });
    invariant(Obj.instanceOf(Meeting.Meeting, addResult.data?.object));
    await invokePromise(MeetingOperation.SetActive, { object: addResult.data?.object });
  }, [invokePromise, db, channel]);

  return (
    <div>
      <div className='px-2 min-h-[3rem] flex justify-end items-center'>
        <Button onClick={handleCreateMeeting}>{t('create-meeting.label')}</Button>
      </div>
      <RowList.Root>
        <RowList.Viewport>
          <RowList.Content aria-label={t('meeting-list.label')}>
            {sortedMeetings.map((meeting) => (
              <MeetingItem key={meeting.id} meeting={meeting} getLabel={meetingMetadata.label} />
            ))}
          </RowList.Content>
        </RowList.Viewport>
      </RowList.Root>
    </div>
  );
};
