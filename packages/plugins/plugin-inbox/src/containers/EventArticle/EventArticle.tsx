//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { getObjectPathFromObject, LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { useQuery } from '@dxos/react-client/echo';
import { Button, Icon, Panel } from '@dxos/react-ui';
import { Text } from '@dxos/schema';
import { AnchoredTo, Event as EventType } from '@dxos/types';

import { Event, type EventHeaderProps, useTargetIntegration } from '#components';
import { useShadowObject } from '#hooks';
import { InboxOperation, DraftEvent } from '#types';

export type EventArticleProps = AppSurface.ArticleProps<EventType.Event, {}, Obj.Unknown>;

export const EventArticle = ({ role, subject, companionTo: calendar }: EventArticleProps) => {
  const { invokePromise } = useOperationInvoker();
  const id = Obj.getURI(subject);
  const db = Obj.getDatabase(calendar);
  // Resolve the live (mutable, reactive) db object so edits to a draft re-render the controlled
  // inputs. The companion subject can be a non-reactive snapshot; querying by id yields the proxy.
  const live = useQuery(db, Query.select(Filter.id(subject.id)))[0];
  const event = live ?? subject;
  const [shadowedEvent, createShadowEvent] = useShadowObject(db, subject, EventType.Event);
  const notes = shadowedEvent?.notes?.target;
  // A draft event (locally created, not yet synced) is editable and savable.
  const draft = DraftEvent.instanceOf(event);
  // Saving (pushing to Google Calendar) requires an integration targeting the calendar.
  const { integration } = useTargetIntegration(calendar);

  // Objects anchored to this event (e.g. a Meeting) surfaced as relation chips in the header.
  const relatedObjects = useQuery(db, Query.select(Filter.id(subject.id)).targetOf(AnchoredTo.AnchoredTo).source());
  const handleOpenObject = useCallback(
    (object: Obj.Unknown) => {
      void invokePromise(LayoutOperation.Open, { subject: [getObjectPathFromObject(object)] });
    },
    [invokePromise],
  );

  const handleNoteCreate = useCallback(async () => {
    invariant(db);
    const event = createShadowEvent();
    const notes = await event.notes?.load();
    if (!notes) {
      Obj.update(event, (event) => {
        event.notes = Ref.make(Text.make());
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

  // Promote the event from a companion to the main view (mirrors MessageArticle).
  const handleOpen = useCallback(() => {
    void invokePromise(LayoutOperation.Open, { subject: [getObjectPathFromObject(event)] });
  }, [invokePromise, event]);

  // Push this draft event to Google Calendar.
  // NOTE: `spaceId` scopes the spawned operation process so its space-affinity services
  // (Database/Feed/Credentials) can materialize.
  const handleSave = useCallback(() => {
    if (calendar) {
      void invokePromise(InboxOperation.SyncDraftEvents, { calendar, event }, { spaceId: db?.spaceId });
    }
  }, [invokePromise, calendar, event, db]);

  // Delete the event (locally if draft, otherwise on Google Calendar too).
  const handleDelete = useCallback(() => {
    if (calendar) {
      void invokePromise(InboxOperation.DeleteEvent, { calendar, event }, { spaceId: db?.spaceId });
    }
  }, [invokePromise, calendar, event, db]);

  return (
    <Event.Root event={event}>
      <Panel.Root role={role} className='dx-document'>
        <Panel.Toolbar asChild>
          <Event.Toolbar
            alwaysActive
            onNoteCreate={handleNoteCreate}
            onOpen={calendar ? handleOpen : undefined}
            onSave={draft ? handleSave : undefined}
            saveDisabled={!integration}
            onDelete={calendar ? handleDelete : undefined}
          />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Event.Viewport>
            <Event.Header db={db} editable={draft} onContactCreate={handleContactCreate} />
            {relatedObjects.length > 0 && (
              <div role='none' className='flex flex-wrap gap-1 px-2 py-1 border-b border-subdued-separator'>
                {relatedObjects.map((object) => (
                  <Button key={object.id} variant='ghost' onClick={() => handleOpenObject(object)} classNames='gap-1'>
                    <Icon icon='ph--link--regular' size={4} />
                    <span className='truncate'>{Obj.getLabel(object) ?? object.id}</span>
                  </Button>
                ))}
              </div>
            )}
            <Event.Body editable={draft} />
            {/* TODO(burdon): Suppress markdown toolbar if section. */}
            {notes && (
              <Surface.Surface type={AppSurface.Section} data={{ subject: notes, attendableId: id }} limit={1} />
            )}
          </Event.Viewport>
        </Panel.Content>
      </Panel.Root>
    </Event.Root>
  );
};
