//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { Button, Flex, useTranslation } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';
import { Channel } from '@dxos/types';

import { meta } from '#meta';
import { Meeting, MeetingOperation } from '#types';

// TODO(wittjosiah): Add a story which renders meetings alongside call?

type MeetingItemProps = {
  meeting: Meeting.Meeting;
  getLabel: (meeting: Meeting.Meeting) => string;
};

const MeetingItem = ({ meeting, getLabel }: MeetingItemProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();

  const handleSelectMeeting = useCallback(
    () => invokePromise(MeetingOperation.SetActive, { object: meeting }),
    [invokePromise, meeting],
  );

  return (
    <Listbox.Item id={meeting.id} classNames='grid grid-cols-[1fr_auto] items-center' onClick={handleSelectMeeting}>
      <span className='truncate'>{getLabel(meeting)}</span>
      {/* Visual affordance only — listbox options can't legally contain focusable
          descendants, so the row itself drives selection via onClick above. */}
      <Button tabIndex={-1} aria-hidden onClick={handleSelectMeeting}>
        {t('select-meeting.label')}
      </Button>
    </Listbox.Item>
  );
};

export type MeetingsListProps = AppSurface.ArticleProps<undefined, {}, Obj.Unknown>;

export const MeetingsList = ({ companionTo: channel }: MeetingsListProps) => {
  const { t } = useTranslation(meta.profile.key);
  const { invokePromise } = useOperationInvoker();
  const db = Obj.getDatabase(channel);
  const meetings = useQuery(db, Query.type(Meeting.Meeting));
  // TODO(wittjosiah): This should be done in the query.
  const sortedMeetings = useMemo(
    () => meetings.toSorted((a, b) => (Obj.getLabel(a) ?? '').localeCompare(Obj.getLabel(b) ?? '')),
    [meetings],
  );

  const getLabel = useCallback(
    (meeting: Meeting.Meeting) => Obj.getLabel(meeting) ?? t('meeting.label') ?? meeting.id,
    [t],
  );

  const handleCreateMeeting = useCallback(async () => {
    invariant(db);
    const createResult = await invokePromise(MeetingOperation.Create, { channel: channel as Channel.Channel });
    invariant(Obj.instanceOf(Meeting.Meeting, createResult.data?.object));
    const addResult = await invokePromise(
      SpaceOperation.AddObject,
      { object: createResult.data?.object },
      { spaceId: db.spaceId },
    );
    invariant(Obj.instanceOf(Meeting.Meeting, addResult.data?.object));
    await invokePromise(MeetingOperation.SetActive, { object: addResult.data?.object });
  }, [invokePromise, db, channel]);

  return (
    <div>
      <Flex align='center' justify='end' classNames='px-2 min-h-[3rem]'>
        <Button onClick={handleCreateMeeting}>{t('create-meeting.label')}</Button>
      </Flex>
      <Listbox.Root>
        <Listbox.Viewport>
          <Listbox.Content aria-label={t('meeting-list.label')}>
            {sortedMeetings.map((meeting) => (
              <MeetingItem key={meeting.id} meeting={meeting} getLabel={getLabel} />
            ))}
          </Listbox.Content>
        </Listbox.Viewport>
      </Listbox.Root>
    </div>
  );
};

MeetingsList.displayName = 'MeetingsList';
