//
// Copyright 2026 DXOS.org
//

import { addMinutes, differenceInMinutes, format } from 'date-fns';
import React, { useState } from 'react';

import { type Database } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Card, DatePicker, Input, Select, useTranslation } from '@dxos/react-ui';
import { type Actor, type Event as EventType } from '@dxos/types';

import { meta } from '#meta';

import { Header } from '../Header';

export type EventEditorProps = {
  event: EventType.Event;
  db?: Database.Database;
  onContactCreate?: (actor: Actor.Actor) => void;
};

/** Duration presets (minutes) offered as an alternative to picking an explicit end time. */
const DURATION_PRESETS = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '90 minutes' },
  { value: '120', label: '2 hours' },
  { value: '180', label: '3 hours' },
];
const CUSTOM_END = 'custom';

const parseDate = (iso?: string): Date | undefined => {
  if (!iso) {
    return undefined;
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const applyTime = (date: Date | undefined, time: string): Date => {
  const [hours, minutes] = time.split(':').map((part) => parseInt(part, 10));
  const out = date ? new Date(date) : new Date();
  out.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return out;
};

/** Standard react-ui date (+ optional time) picker bound to an ISO string value. */
const DateTimeField = ({
  value,
  withTime = true,
  onChange,
}: {
  value?: string;
  withTime?: boolean;
  onChange: (iso: string) => void;
}) => {
  const date = parseDate(value);
  return (
    <DatePicker.Root
      mode='single'
      withTime={withTime}
      value={date}
      onValueChange={(next) => next && onChange(next.toISOString())}
    >
      <DatePicker.Trigger format={withTime ? 'PPP p' : 'PPP'} />
      <DatePicker.Content>
        <DatePicker.Calendar />
        {withTime && (
          <Input.Root>
            <Input.Time
              value={date ? format(date, 'HH:mm') : ''}
              onValueChange={(time) => onChange(applyTime(date, time).toISOString())}
            />
          </Input.Root>
        )}
      </DatePicker.Content>
    </DatePicker.Root>
  );
};

/**
 * Editable form for an event's title, all-day flag, start, and end (explicit or via a duration preset).
 * Used for draft events. Subscribes to the live ECHO object via `useObject` so edits re-render the
 * controlled inputs; mutations go through its update callback.
 */
export const EventEditor = ({ event, db, onContactCreate }: EventEditorProps) => {
  const { t } = useTranslation(meta.id);
  const [data, update] = useObject(event);

  const allDay = !!data.allDay;
  const start = parseDate(data.startDate);
  const end = parseDate(data.endDate);
  const durationMinutes = start && end ? differenceInMinutes(end, start) : undefined;
  const presetValue = DURATION_PRESETS.find((preset) => Number(preset.value) === durationMinutes)?.value;
  // Start in "custom end" mode when the current duration doesn't match a preset.
  const [customEnd, setCustomEnd] = useState(presetValue === undefined);

  // Moving the start: all-day events are single-day (end tracks start); otherwise, in duration mode,
  // preserve the duration.
  const setStart = (iso: string) =>
    update((event) => {
      event.startDate = iso;
      if (allDay) {
        event.endDate = iso;
      } else if (!customEnd && durationMinutes != null) {
        event.endDate = addMinutes(new Date(iso), durationMinutes).toISOString();
      }
    });

  const setEnd = (iso: string) =>
    update((event) => {
      event.endDate = iso;
    });

  const handleDurationChange = (value: string) => {
    if (value === CUSTOM_END) {
      setCustomEnd(true);
      return;
    }
    setCustomEnd(false);
    update((event) => {
      event.endDate = addMinutes(start ?? new Date(), Number(value)).toISOString();
    });
  };

  return (
    <>
      <Card.Row>
        <Input.Root>
          <Input.TextInput
            placeholder={t('event-untitled.label')}
            value={data.title ?? ''}
            onChange={(ev) =>
              update((event) => {
                event.title = ev.target.value;
              })
            }
          />
        </Input.Root>
      </Card.Row>

      <Card.Row>
        <Input.Root>
          <div className='flex items-center gap-2'>
            <Input.Switch
              checked={allDay}
              onCheckedChange={(next) =>
                update((event) => {
                  event.allDay = next;
                  // All-day events are single-day: collapse the end onto the start.
                  if (next) {
                    event.endDate = event.startDate;
                  }
                })
              }
            />
            <Input.Label>{t('event-all-day.label')}</Input.Label>
          </div>
        </Input.Root>
      </Card.Row>

      <Card.Row icon='ph--calendar--regular'>
        <DateTimeField value={data.startDate} withTime={!allDay} onChange={setStart} />
      </Card.Row>

      {/* All-day events are single-day, so no end field; timed events choose a duration or explicit end. */}
      {!allDay && (
        <Card.Row>
          <div className='flex items-center gap-2'>
            <Select.Root value={customEnd ? CUSTOM_END : presetValue} onValueChange={handleDurationChange}>
              <Select.TriggerButton placeholder={t('event-duration.placeholder')} />
              <Select.Portal>
                <Select.Content>
                  <Select.Viewport>
                    {DURATION_PRESETS.map((preset) => (
                      <Select.Option key={preset.value} value={preset.value}>
                        {preset.label}
                      </Select.Option>
                    ))}
                    <Select.Option value={CUSTOM_END}>{t('event-duration-custom.label')}</Select.Option>
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
            {customEnd && <DateTimeField value={data.endDate} withTime onChange={setEnd} />}
          </div>
        </Card.Row>
      )}

      {data.attendees.map((attendee, index) => (
        <Header.PersonRow key={attendee.email ?? index} actor={attendee} db={db} onContactCreate={onContactCreate} />
      ))}
    </>
  );
};
