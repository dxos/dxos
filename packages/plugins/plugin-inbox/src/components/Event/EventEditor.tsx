//
// Copyright 2026 DXOS.org
//

import { addMinutes, differenceInMinutes, format } from 'date-fns';
import React, { useCallback, useRef } from 'react';

import { type Database, Filter, Obj, Ref } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { Row } from '@dxos/react-ui-card';
import { type EditorController } from '@dxos/react-ui-editor';
import { EMAIL_REGEX, REF_REGEX, RefEditor } from '@dxos/react-ui-form';
import * as Card from '@dxos/react-ui/Card';
import * as Field from '@dxos/react-ui/Field';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Select from '@dxos/react-ui/Select';
import { type Actor, type Event as EventType, Person } from '@dxos/types';

import { meta } from '#meta';

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
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [data, update] = useObject(event);

  const allDay = !!data.allDay;
  const start = parseDate(data.startDate);
  const end = parseDate(data.endDate);
  const durationMinutes = start && end ? differenceInMinutes(end, start) : undefined;
  const presetValue = DURATION_PRESETS.find((preset) => Number(preset.value) === durationMinutes)?.value;

  const handleStartDateChange = useCallback(
    (value: string) => {
      const iso = fromDateInput(value);
      if (iso) {
        update((event) => {
          // All-day events are single-day: keep the end aligned with the start.
          event.startDate = iso;
          event.endDate = iso;
        });
      }
    },
    [update],
  );

  const handleStartDateTimeChange = useCallback(
    (value: string) => {
      const iso = fromDateInput(value);
      if (iso) {
        update((event) => {
          const previousStart = parseDate(event.startDate);
          const previousEnd = parseDate(event.endDate);
          // Preserve the current duration so the end stays after the new start.
          const duration = previousStart && previousEnd ? differenceInMinutes(previousEnd, previousStart) : 0;
          event.startDate = iso;
          event.endDate = addMinutes(new Date(iso), Math.max(duration, MIN_DURATION_MINUTES)).toISOString();
        });
      }
    },
    [update],
  );

  const handleEndDateTimeChange = useCallback(
    (value: string) => {
      const iso = fromDateInput(value);
      if (iso) {
        update((event) => {
          const startDate = parseDate(event.startDate);
          // The end must stay after the start; clamp to a minimum duration otherwise.
          event.endDate =
            startDate && new Date(iso) <= startDate ? addMinutes(startDate, MIN_DURATION_MINUTES).toISOString() : iso;
        });
      }
    },
    [update],
  );

  const handleDurationChange = useCallback(
    (value: string) => {
      update((event) => {
        const startDate = parseDate(event.startDate) ?? new Date();
        event.endDate = addMinutes(startDate, Number(value)).toISOString();
      });
    },
    [update],
  );

  const handleAllDayChange = useCallback(
    (next: boolean) => {
      update((event) => {
        event.allDay = next;
        // All-day events are single-day: collapse the end onto the start.
        if (next) {
          event.endDate = event.startDate;
        }
      });
    },
    [update],
  );

  const handleAttendeeRemove = useCallback(
    (index: number) => {
      update((event) => {
        event.attendees = event.attendees.filter((_, position) => position !== index);
      });
    },
    [update],
  );

  // Attendee input: commit each completed token (terminated by whitespace) as an attendee —
  // an `@<id>` reference resolves to a Person contact; otherwise it must be a well-formed email.
  // Committed tokens are removed from the input so the row reads as a blank "add attendee" slot.
  const actorListRef = useRef<EditorController | null>(null);
  const people = useQuery(db, Filter.type(Person.Person));
  const handleAttendeesChange = useCallback(
    (value: string) => {
      const endsWithSpace = /\s$/.test(value);
      const tokens = value.split(/\s+/).filter(Boolean);
      const tail = endsWithSpace ? undefined : tokens.pop();

      const actors: Actor.Actor[] = [];
      const remainder: string[] = [];
      for (const token of tokens) {
        const ref = token.match(REF_REGEX);
        const person = ref ? people.find((person) => person.id === ref[1]) : undefined;
        if (person) {
          actors.push({
            contact: Ref.make(person),
            name: Obj.getLabel(person),
            email: person.emails?.[0]?.value,
          });
        } else if (EMAIL_REGEX.test(token)) {
          actors.push({ email: token });
        } else {
          // Incomplete/invalid tokens stay in the input.
          remainder.push(token);
        }
      }

      if (actors.length > 0) {
        update((event) => {
          // Skip duplicates (same contact or email), including duplicates within this batch.
          const actorKeys = (actor: Actor.Actor): string[] =>
            [
              actor.contact && `contact:${refEntityId(actor.contact.uri.toString())}`,
              actor.email && `email:${actor.email.toLowerCase()}`,
            ].filter((key): key is string => !!key);
          const seen = new Set(event.attendees.flatMap(actorKeys));
          const next = actors.filter((actor) => {
            const keys = actorKeys(actor);
            if (keys.length === 0 || keys.some((key) => seen.has(key))) {
              return false;
            }
            keys.forEach((key) => seen.add(key));
            return true;
          });
          if (next.length > 0) {
            event.attendees = [...event.attendees, ...next];
          }
        });
        actorListRef.current?.setText([...remainder, tail].filter(Boolean).join(' '));
      }
    },
    [update, people],
  );

  // The trailing control of each date row (all-day switch, duration select) takes the SAME fixed
  // width, so the two rows' leading date fields end at the same x and the controls line up as a
  // column — which the nested grid used to provide.
  const trailingClasses = 'shrink-0 min-w-32';

  return (
    <>
      <Card.Row>
        <Field.Root>
          <Input.Root
            placeholder={t('event-untitled.label')}
            value={data.title ?? ''}
            onChange={(ev) =>
              update((event) => {
                event.title = ev.target.value;
              })
            }
          />
        </Field.Root>
      </Card.Row>

      <Field.Root>
        <Card.Row>
          <Layout.Block>
            <Layout.Block>
              <Icon.Icon icon='ph--calendar--regular' />
            </Layout.Block>
          </Layout.Block>
          {/* Flex, NOT a nested grid: `Card.Row`'s grid placement would collapse a nested grid's children into one track. */}
          <Layout.Flex align='center' gap='sm'>
            <div className='grow'>
              {allDay ? (
                <Input.Date type='date' value={toDateInput(data.startDate)} onValueChange={handleStartDateChange} />
              ) : (
                <Input.Date
                  type='datetime-local'
                  value={toDateTimeInput(data.startDate)}
                  onValueChange={handleStartDateTimeChange}
                />
              )}
            </div>
            <Input.Switch
              checked={allDay}
              onCheckedChange={({ checked }) => handleAllDayChange(checked)}
              label={t('event-all-day.label')}
            />
          </Layout.Flex>
        </Card.Row>
      </Field.Root>

      {!allDay && (
        <Field.Root>
          <Card.Row>
            <Layout.Block>
              <Layout.Block>
                <Icon.Icon icon='ph--calendar--regular' />
              </Layout.Block>
            </Layout.Block>
            <Layout.Flex align='center' gap='sm'>
              <div className='grow'>
                <Input.Date
                  type='datetime-local'
                  value={toDateTimeInput(data.endDate)}
                  onValueChange={handleEndDateTimeChange}
                />
              </div>
              <div className={trailingClasses}>
                <SelectDuration value={presetValue} onValueChange={handleDurationChange} />
              </div>
            </Layout.Flex>
          </Card.Row>
        </Field.Root>
      )}

      {data.attendees.map((attendee, index) => (
        <Row.Person
          key={attendee.email ?? index}
          actor={attendee}
          role='attendee'
          db={db}
          onContactCreate={onContactCreate}
          onRemove={() => handleAttendeeRemove(index)}
        />
      ))}

      {/* Always-blank row for adding the next attendee. */}
      <Card.Row classNames='items-center'>
        <Layout.Block>
          <Icon.Icon icon='ph--user-plus--regular' />
        </Layout.Block>
        <RefEditor
          db={db}
          type={Person.Person}
          match={EMAIL_REGEX}
          getLabel={getPersonLabel}
          getValues={getPersonValues}
          icon='ph--user--regular'
          placeholder={t('event-add-attendee.placeholder')}
          activateOnTyping
          onChange={handleAttendeesChange}
          ref={actorListRef}
        />
      </Card.Row>
    </>
  );
};

type SelectDurationProps = {
  value?: string;
  onValueChange: (value: string) => void;
};

/** Duration preset picker. Empty string keeps the control controlled so it clears to the placeholder. */
const SelectDuration = ({ value, onValueChange }: SelectDurationProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <Select.Root
      value={[value ?? '']}
      onValueChange={({ value: [value] }) => onValueChange(value)}
      items={DURATION_PRESETS.map((preset) => ({ value: preset.value, label: preset.label }))}
    >
      <Select.Trigger placeholder={t('event-duration.placeholder')} />
      <Select.Content>
        {DURATION_PRESETS.map((preset) => (
          <Select.Item key={preset.value} item={{ value: preset.value, label: preset.label }} />
        ))}
      </Select.Content>
    </Select.Root>
  );
};

/** Display label for a person attendee (label annotation, then primary email, then id). */
const getPersonLabel = (object: Obj.Unknown): string => {
  if (Obj.instanceOf(Person.Person, object)) {
    return Obj.getLabel(object) ?? object.emails?.[0]?.value ?? object.id;
  }
  return Obj.getLabel(object) ?? object.id;
};

/** Person email addresses (shown as picker item detail). */
const getPersonValues = (object: Obj.Unknown): readonly string[] =>
  Obj.instanceOf(Person.Person, object) ? (object.emails ?? []).map(({ value }) => value) : [];

/**
 * Bare entity id from a ref URI. Refs to the same object can carry different URI forms
 * (`echo:/<id>`, `echo://<spaceId>/<id>`), so compare trailing ids.
 */
const refEntityId = (uri: string): string | undefined => uri.split(/[:/]/).filter(Boolean).pop();

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

/** Formats a stored ISO string as the `YYYY-MM-DD` value expected by `Field.Date`. */
const toDateInput = (iso?: string): string => {
  const date = parseDate(iso);
  return date ? format(date, 'yyyy-MM-dd') : '';
};

/** Formats a stored ISO string as the `YYYY-MM-DDTHH:mm` value expected by `Field.DateTime`. */
const toDateTimeInput = (iso?: string): string => {
  const date = parseDate(iso);
  return date ? format(date, "yyyy-MM-dd'T'HH:mm") : '';
};

/** Parses a segmented `Field.Date`/`Field.DateTime` value (local time) back to a stored ISO string. */
const fromDateInput = (value: string): string | undefined => {
  if (!value) {
    return undefined;
  }
  // Date-only values are parsed as local midnight to avoid a UTC day shift.
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};
