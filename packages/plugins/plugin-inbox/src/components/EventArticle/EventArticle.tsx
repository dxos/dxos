//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { type Feed, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Layout } from '@dxos/react-ui';
import { Text } from '@dxos/schema';
import { Event as EventType } from '@dxos/types';

import { useShadowObject } from '../../hooks';
import { InboxOperation } from '../../types';

import { Event, type EventHeaderProps } from './Event';

export type EventArticleProps = SurfaceComponentProps<
  EventType.Event,
  {
    feed: Feed.Feed;
  }
>;

export const EventArticle = ({ role, subject, feed }: EventArticleProps) => {
  const { invokePromise } = useOperationInvoker();
  const id = Obj.getDXN(subject).toString();
  const db = Obj.getDatabase(feed);
  const [shadowedEvent, createShadowEvent] = useShadowObject(db, subject, EventType.Event);
  const notes = shadowedEvent?.notes?.target;

  const handleNoteCreate = useCallback(async () => {
    invariant(db);
    const event = createShadowEvent();
    const notes = await event.notes?.load();
    if (!notes) {
      Obj.change(event, (e) => {
        e.notes = Ref.make(Text.make());
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
    <Layout.Main role={role} toolbar>
      <Event.Root event={subject}>
        <Event.Toolbar onNoteCreate={handleNoteCreate} />
        <Event.Viewport>
          <Event.Header db={db} onContactCreate={handleContactCreate} />
          <Event.Content />
          {/* TODO(burdon): Suppress markdown toolbar if section. */}
          {notes && <Surface.Surface role='section' data={{ id, subject: notes }} limit={1} />}
        </Event.Viewport>
      </Event.Root>
    </Layout.Main>
  );
};
