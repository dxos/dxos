//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { createIntent } from '@dxos/app-framework';
import { Surface, type SurfaceComponentProps, useIntentDispatcher } from '@dxos/app-framework/react';
import { Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { StackItem } from '@dxos/react-ui-stack';
import { Text } from '@dxos/schema';
import { Event as EventType } from '@dxos/types';

import { useShadowObject } from '../../hooks';
import { type Calendar, InboxAction } from '../../types';

import { Event, type EventHeaderProps } from './Event';

export const EventArticle = ({
  subject,
  calendar,
}: SurfaceComponentProps<EventType.Event> & { calendar: Calendar.Calendar }) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
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
        void dispatch(createIntent(InboxAction.ExtractContact, { db, actor }));
      }
    },
    [db, dispatch],
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
