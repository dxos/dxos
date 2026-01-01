//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Surface, type SurfaceComponentProps, useOperationInvoker } from '@dxos/app-framework/react';
import { Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { StackItem } from '@dxos/react-ui-stack';
import { Text } from '@dxos/schema';
import { Event as EventType } from '@dxos/types';

import { useShadowObject } from '../../hooks';
import { type Calendar, InboxOperation } from '../../types';

import { Event, type EventHeaderProps } from './Event';

export const EventArticle = ({
  subject,
  calendar,
}: SurfaceComponentProps<EventType.Event> & { calendar: Calendar.Calendar }) => {
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
      event.notes = Ref.make(Text.make());
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
    <StackItem.Content toolbar>
      <Event.Root event={subject}>
        <Event.Toolbar onNoteCreate={handleNoteCreate} />
        <Event.Viewport>
          <Event.Header db={db} onContactCreate={handleContactCreate} />
          <Event.Content />
          {/* TODO(burdon): Suppress markdown toolbar if section. */}
          {notes && <Surface role='section' data={{ id, subject: notes }} limit={1} />}
        </Event.Viewport>
      </Event.Root>
    </StackItem.Content>
  );
};
