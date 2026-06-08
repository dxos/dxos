//
// Copyright 2026 DXOS.org
//

import { addMinutes, differenceInMinutes, format } from 'date-fns';
import React from 'react';

import { type Database } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Card, IconBlock, Input, Select, useTranslation } from '@dxos/react-ui';
import { type Actor, type Event as EventType } from '@dxos/types';

import { meta } from '#meta';

import { Header } from '../Header';

export type EventEditorProps = {
  event: EventType.Event;
  db?: Database.Database;
  onContactCreate?: (actor: Actor.Actor) => void;
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

  const handleDurationChange = (value: string) => {
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

      <Input.Root>
        <Card.Row
          icon={
            <IconBlock>
              <Input.TriggerIcon icon='ph--calendar--regular' />
            </IconBlock>
          }
        >
          {allDay ? (
            <Input.Date
              value={toDateInput(data.startDate)}
              onValueChange={(value) => {
                const iso = fromDateInput(value);
                if (iso) {
                  update((event) => {
                    // All-day events are single-day: keep the end aligned with the start.
                    event.startDate = iso;
                    event.endDate = iso;
                  });
                }
              }}
            />
          ) : (
            <Input.DateTime
              value={toDateTimeInput(data.startDate)}
              onValueChange={(value) => {
                const iso = fromDateInput(value);
                if (iso) {
                  update((event) => {
                    const previousStart = parseDate(event.startDate);
                    const previousEnd = parseDate(event.endDate);
                    // Preserve the current duration so the end stays after the new start.
                    const duration =
                      previousStart && previousEnd ? differenceInMinutes(previousEnd, previousStart) : 0;
                    event.startDate = iso;
                    event.endDate = addMinutes(
                      new Date(iso),
                      Math.max(duration, MIN_DURATION_MINUTES),
                    ).toISOString();
                  });
                }
              }}
            />
          )}
        </Card.Row>
      </Input.Root>

      {!allDay && (
        <Input.Root>
          <Card.Row
            icon={
              <IconBlock>
                <Input.TriggerIcon icon='ph--calendar--regular' />
              </IconBlock>
            }
          >
            <div className='grid grid-cols-[1fr_auto] gap-2'>
              <Input.DateTime
                value={toDateTimeInput(data.endDate)}
                onValueChange={(value) => {
                  const iso = fromDateInput(value);
                  if (iso) {
                    update((event) => {
                      const startDate = parseDate(event.startDate);
                      // The end must stay after the start; clamp to a minimum duration otherwise.
                      event.endDate =
                        startDate && new Date(iso) <= startDate
                          ? addMinutes(startDate, MIN_DURATION_MINUTES).toISOString()
                          : iso;
                    });
                  }
                }}
              />
              <Select.Root value={presetValue} onValueChange={handleDurationChange}>
                <Select.TriggerButton placeholder={t('event-duration.placeholder')} />
                <Select.Portal>
                  <Select.Content>
                    <Select.Viewport>
                      {DURATION_PRESETS.map((preset) => (
                        <Select.Option key={preset.value} value={preset.value}>
                          {preset.label}
                        </Select.Option>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
          </Card.Row>
        </Input.Root>
      )}

      {data.attendees.map((attendee, index) => (
        <Header.PersonRow key={attendee.email ?? index} actor={attendee} db={db} onContactCreate={onContactCreate} />
      ))}
    </>
  );
};

/** Minimum event duration (minutes) enforced to keep the end after the start. */
const MIN_DURATION_MINUTES = 15;

/** Duration presets (minutes) offered as an alternative to picking an explicit end time. */
// TODO(burdon): Translations.
const DURATION_PRESETS = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '90 minutes' },
  { value: '120', label: '2 hours' },
  { value: '180', label: '3 hours' },
];

const parseDate = (iso?: string): Date | undefined => {
  if (!iso) {
    return undefined;
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

/** Formats a stored ISO string as the `YYYY-MM-DD` value expected by `Input.Date`. */
const toDateInput = (iso?: string): string => {
  const date = parseDate(iso);
  return date ? format(date, 'yyyy-MM-dd') : '';
};

/** Formats a stored ISO string as the `YYYY-MM-DDTHH:mm` value expected by `Input.DateTime`. */
const toDateTimeInput = (iso?: string): string => {
  const date = parseDate(iso);
  return date ? format(date, "yyyy-MM-dd'T'HH:mm") : '';
};

/** Parses a segmented `Input.Date`/`Input.DateTime` value (local time) back to a stored ISO string. */
const fromDateInput = (value: string): string | undefined => {
  if (!value) {
    return undefined;
  }
  // Date-only values are parsed as local midnight to avoid a UTC day shift.
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};
