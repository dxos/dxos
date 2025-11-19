//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Surface, type SurfaceComponentProps } from '@dxos/app-framework/react';
import { Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { Text } from '@dxos/schema';
import { Event as EventType } from '@dxos/types';

import { type Calendar } from '../../types';

import { Event } from './Event';

export const EventArticle = ({
  subject,
  calendar,
}: SurfaceComponentProps<EventType.Event> & { calendar: Calendar.Calendar }) => {
  const id = Obj.getDXN(subject).toString();
  const space = getSpace(calendar);
  const events = useQuery(space, Filter.type(EventType.Event));
  const shadowedEvent = useMemo(
    () =>
      events.find((event) => {
        const meta = Obj.getMeta(event);
        return meta.keys.find((key) => key.source === 'echo' && key.id === id);
      }),
    [id, events],
  );
  const notes = shadowedEvent?.notes?.target;

  const handleCreateNotes = useCallback(async () => {
    invariant(space);
    let event = shadowedEvent;
    if (!event) {
      event = space.db.add(Obj.clone(subject));
      const meta = Obj.getMeta(event);
      meta.keys.push({ source: 'echo', id });
    }

    const notes = await event.notes?.load();
    if (!notes) {
      event.notes = Ref.make(Text.make());
    }
  }, [id, subject, space, shadowedEvent]);

  return (
    <StackItem.Content toolbar>
      <Event.Root event={subject}>
        <Event.Toolbar />
        <Event.Viewport>
          <Event.Header onContactCreate={handleCreateNotes} />
          <Event.Content />
          {/* TODO(burdon): Suppress toolbar. */}
          {notes && <Surface role='section' data={{ id, subject: notes }} limit={1} />}
        </Event.Viewport>
      </Event.Root>
    </StackItem.Content>
  );
};
