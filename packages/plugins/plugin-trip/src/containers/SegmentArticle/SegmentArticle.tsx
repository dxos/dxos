//
// Copyright 2026 DXOS.org
//

import { format } from 'date-fns';
import React, { type ChangeEvent, useCallback } from 'react';

import { Obj } from '@dxos/echo';
import { Icon, Input, Panel, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { Segment, type Trip } from '#types';

/**
 * Props for the SegmentArticle companion surface. Follows the EventArticle
 * pattern from plugin-inbox: the segment is provided as `subject` and the
 * parent Trip is provided as `companionTo`. The graph-builder extension
 * resolves the current selection on the Trip's attendable context into the
 * subject before the surface is dispatched.
 */
export type SegmentArticleProps = {
  role?: string;
  subject: Segment.Any | string;
  companionTo: Trip.Trip;
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className='grid grid-cols-[8rem_1fr] gap-2 py-1'>
    <span className='text-description text-sm'>{label}</span>
    <span className='text-sm'>{value}</span>
  </div>
);

const formatDate = (iso?: string): string | undefined => {
  const date = Segment.parseDate(iso);
  return date ? format(date, 'PPp') : undefined;
};

/** Convert an ISO string to a value suitable for an HTML datetime-local input. */
const toDateTimeLocal = (iso?: string): string => {
  const date = Segment.parseDate(iso);
  if (!date) {
    return '';
  }
  // YYYY-MM-DDTHH:mm in local time.
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const fromDateTimeLocal = (value: string): string | undefined => {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

/** Labeled field with a stacked label and a single child input. */
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Input.Root>
    <Input.Label classNames='text-description text-sm py-1'>{label}</Input.Label>
    {children}
  </Input.Root>
);

type FlightSegmentType = Extract<Segment.Any, { _tag: 'flight' }>;
type MutableFlight = { -readonly [K in keyof FlightSegmentType]: FlightSegmentType[K] };

type FlightFormProps = {
  segment: FlightSegmentType;
  updateFlight: (mutate: (draft: MutableFlight) => void) => void;
};

/** Editable form for a flight segment. */
const FlightForm = ({ segment, updateFlight }: FlightFormProps) => {
  const onChange = useCallback((apply: (draft: MutableFlight) => void) => apply, []);

  return (
    <div className='grid grid-cols-1 @md:grid-cols-2 gap-3'>
      <Field label='Airline'>
        <Input.TextInput
          value={segment.airline?.name ?? ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            updateFlight(
              onChange((draft) => {
                draft.airline = { ...(draft.airline ?? {}), name: e.target.value };
              }),
            )
          }
        />
      </Field>
      <Field label='Flight number'>
        <Input.TextInput
          value={segment.flightNumber ?? ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            updateFlight(
              onChange((draft) => {
                draft.flightNumber = e.target.value || undefined;
              }),
            )
          }
        />
      </Field>
      <Field label='From'>
        <Input.TextInput
          placeholder='SFO'
          value={segment.origin?.code ?? ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            updateFlight(
              onChange((draft) => {
                draft.origin = { ...(draft.origin ?? {}), code: e.target.value };
              }),
            )
          }
        />
      </Field>
      <Field label='To'>
        <Input.TextInput
          placeholder='LHR'
          value={segment.destination?.code ?? ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            updateFlight(
              onChange((draft) => {
                draft.destination = { ...(draft.destination ?? {}), code: e.target.value };
              }),
            )
          }
        />
      </Field>
      <Field label='Departs'>
        <Input.TextInput
          type='datetime-local'
          value={toDateTimeLocal(segment.departAt)}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            updateFlight(
              onChange((draft) => {
                draft.departAt = fromDateTimeLocal(e.target.value);
              }),
            )
          }
        />
      </Field>
      <Field label='Arrives'>
        <Input.TextInput
          type='datetime-local'
          value={toDateTimeLocal(segment.arriveAt)}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            updateFlight(
              onChange((draft) => {
                draft.arriveAt = fromDateTimeLocal(e.target.value);
              }),
            )
          }
        />
      </Field>
      <Field label='Cabin'>
        <select
          className='dx-input rounded px-2 py-1 bg-input-surface'
          value={segment.cabin ?? ''}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            updateFlight(
              onChange((draft) => {
                draft.cabin = (e.target.value as typeof segment.cabin) || undefined;
              }),
            )
          }
        >
          <option value=''>—</option>
          <option value='economy'>Economy</option>
          <option value='premium'>Premium</option>
          <option value='business'>Business</option>
          <option value='first'>First</option>
        </select>
      </Field>
      <Field label='Seat'>
        <Input.TextInput
          value={segment.seat ?? ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            updateFlight(
              onChange((draft) => {
                draft.seat = e.target.value || undefined;
              }),
            )
          }
        />
      </Field>
    </div>
  );
};

/** Read-only field rows for non-flight segment variants. */
const renderModeFields = (segment: Segment.Any): React.ReactNode => {
  switch (segment._tag) {
    case 'train':
      return (
        <>
          {segment.operator?.name && <Row label='Operator' value={segment.operator.name} />}
          {segment.trainNumber && <Row label='Train' value={segment.trainNumber} />}
          {segment.class && <Row label='Class' value={segment.class} />}
          {segment.coach && <Row label='Coach' value={segment.coach} />}
          {segment.seat && <Row label='Seat' value={segment.seat} />}
        </>
      );
    case 'boat':
      return (
        <>
          {segment.operator?.name && <Row label='Operator' value={segment.operator.name} />}
          {segment.vessel && <Row label='Vessel' value={segment.vessel} />}
          {segment.cabin && <Row label='Cabin' value={segment.cabin} />}
        </>
      );
    case 'road':
      return (
        <>
          <Row label='Mode' value={segment.subKind} />
          {segment.operator?.name && <Row label='Operator' value={segment.operator.name} />}
          {segment.vehicleClass && <Row label='Vehicle' value={segment.vehicleClass} />}
        </>
      );
    case 'lodging':
      return (
        <>
          {segment.propertyName && <Row label='Property' value={segment.propertyName} />}
          {segment.operator?.name && <Row label='Chain' value={segment.operator.name} />}
          {segment.roomType && <Row label='Room' value={segment.roomType} />}
        </>
      );
    case 'activity':
      return (
        <>
          <Row label='Title' value={segment.title} />
          {segment.venue?.name && <Row label='Venue' value={segment.venue.name} />}
          {segment.operator?.name && <Row label='Operator' value={segment.operator.name} />}
        </>
      );
    default:
      return null;
  }
};

export const SegmentArticle = ({ role, subject, companionTo: trip }: SegmentArticleProps) => {
  const { t: _t } = useTranslation(meta.id);

  const updateFlight = useCallback(
    (mutate: (draft: MutableFlight) => void) => {
      if (typeof subject !== 'object' || subject === null) {
        return;
      }
      const segmentId = subject.id;
      Obj.update(trip, (trip) => {
        const seg = trip.segments?.find((s) => s.id === segmentId);
        if (seg && seg._tag === 'flight') {
          mutate(seg as MutableFlight);
        }
      });
    },
    [subject, trip],
  );

  if (typeof subject !== 'object' || subject === null) {
    // The graph-builder returns the sentinel string 'segment' when nothing is
    // selected yet.
    return (
      <Panel.Root role={role} className='dx-document'>
        <Panel.Content asChild>
          <div className='p-4 text-description'>Select a segment to view details.</div>
        </Panel.Content>
      </Panel.Root>
    );
  }

  const segment = subject;
  const title = Segment.getTitle(segment);
  const route = Segment.getRoute(segment);
  const departAt = formatDate(segment._tag === 'lodging' ? segment.checkIn : segment.departAt);
  const arriveAt = formatDate(segment._tag === 'lodging' ? segment.checkOut : segment.arriveAt);
  const icon = Segment.kindIcon(segment._tag);

  return (
    <Panel.Root role={role} className='dx-document'>
      <Panel.Content asChild>
        <div className='p-4 flex flex-col gap-3 @container'>
          <div className='flex items-center gap-2'>
            <Icon icon={icon} size={6} />
            <h2 className='text-lg font-medium'>{title}</h2>
            <span className='ml-2 text-xs text-description px-2 py-0.5 rounded bg-attentionSurface'>
              {segment.status}
            </span>
          </div>
          {segment._tag === 'flight' ? (
            <FlightForm segment={segment} updateFlight={updateFlight} />
          ) : (
            <div className='flex flex-col'>
              {route && <Row label='Route' value={route} />}
              {departAt && <Row label={segment._tag === 'lodging' ? 'Check-in' : 'Departs'} value={departAt} />}
              {arriveAt && <Row label={segment._tag === 'lodging' ? 'Check-out' : 'Arrives'} value={arriveAt} />}
              {renderModeFields(segment)}
              {segment.notes && <Row label='Notes' value={segment.notes} />}
            </div>
          )}
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};
