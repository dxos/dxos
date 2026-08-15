//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';
import { Event } from '@dxos/types';

/**
 * A draft calendar event is a local `Event` ECHO object that lives in the space database (not the
 * calendar feed), is parented to its calendar (`Obj.setParent(event, calendar)`), and has not yet been
 * pushed to the remote calendar. It is the calendar analogue of an email draft — created / edited
 * offline, overlaid on the calendar, and pushed on save. Once synced, the provider's sync mapper
 * stamps its foreign key so it is no longer a draft.
 */

/** Creates an Event for local (draft) use. The caller adds it to a db and sets its parent calendar. */
export const make = (props: Parameters<typeof Event.make>[0]): Event.Event => Event.make(props);

/**
 * Whether an event has not yet been synced to any remote calendar.
 *
 * Keyed on the ABSENCE of a foreign key rather than on one provider's: a foreign key is what a sync
 * mapper stamps once the remote accepts the event, so "no key from anyone" is what draft means —
 * checking Google's alone reported every event from any other connector as a perpetual draft.
 */
export const isDraft = (event: Event.Event): boolean => (Obj.getMeta(event).keys?.length ?? 0) === 0;

/** Whether `value` is an unsynced (draft) Event. */
export const instanceOf = (value: unknown): value is Event.Event =>
  Obj.instanceOf(Event.Event, value) && isDraft(value);

/** Whether a draft event is parented to the given calendar (by ECHO id). */
export const belongsTo = (event: unknown, calendarId: string): boolean =>
  instanceOf(event) && Obj.getParent(event)?.id === calendarId;
