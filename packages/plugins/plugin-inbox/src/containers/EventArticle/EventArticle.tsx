//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Panel } from '@dxos/react-ui';
import { Text } from '@dxos/schema';
import { Event as EventType } from '@dxos/types';

import { Event, type EventHeaderProps } from '../../components';
import { useShadowObject } from '../../hooks';
import { type Calendar, InboxOperation } from '../../types';

export type EventArticleProps = SurfaceComponentProps<
  EventType.Event,
  {
    calendar: Calendar.Calendar;
  }
>;

export const EventArticle = ({ role, subject, calendar }: EventArticleProps) => {
  const { invokePromise } = useOperationInvoker();
  const id = Obj.getDXN(subject).toString();
  const db = Obj.getDatabase(calendar);
  const [shadowedEvent, createShadowEvent] = useShadowObject(db, subject, EventType.Event);
  const notes = shadowedEvent?.notes?.target;

  const handleNoteCreate = useCallback(async () => {
    invariant(db);
    const event = createShadowEvent();
    const notes = await event.notes?.load();
    if (!notes) {
      Obj.change(event, (obj) => {
        obj.notes = Ref.make(Text.make());
      });
    }
  }, [id, subject, db, shadowedEvent]);

  const handleContactCreate = useCallback<NonNullable<EventHeaderProps['onContactCreate']>>(
    (actor) => {
      if (db && actor) {
        void invokePromise(InboxOperation.ExtractContact, { db, actor });
      }
    },
    [db, invokePromise],
  );

  return (
    <Event.Root event={subject}>
      <Panel.Root role={role} className='dx-document'>
        <Panel.Toolbar asChild>
          <Event.Toolbar onNoteCreate={handleNoteCreate} />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Event.Viewport>
            <Event.Header db={db} onContactCreate={handleContactCreate} />
            <Event.Content />
            {/* TODO(burdon): Suppress markdown toolbar if section. */}
            {notes && <Surface.Surface role='section' data={{ id, subject: notes }} limit={1} />}
          </Event.Viewport>
        </Panel.Content>
      </Panel.Root>
    </Event.Root>
  );
};
