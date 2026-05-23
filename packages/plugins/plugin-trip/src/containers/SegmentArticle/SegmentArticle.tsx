//
// Copyright 2026 DXOS.org
//

import { format } from 'date-fns';
import * as Schema from 'effect/Schema';
import React, { useCallback } from 'react';

import { Obj } from '@dxos/echo';
import { Icon, Panel, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

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
  subject: Segment.Segment | string;
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

//
// Flight form
//

const FlightProperties = Schema.Struct({
  airlineName: Schema.optional(Schema.String).annotations({ title: 'Airline' }),
  flightNumber: Schema.optional(Schema.String).annotations({ title: 'Flight number' }),
  originCode: Schema.optional(Schema.String).annotations({ title: 'From' }),
  destinationCode: Schema.optional(Schema.String).annotations({ title: 'To' }),
  departAt: Schema.optional(Schema.String).annotations({ title: 'Departs' }),
  arriveAt: Schema.optional(Schema.String).annotations({ title: 'Arrives' }),
  cabin: Schema.optional(Segment.Cabin).annotations({ title: 'Cabin' }),
  seat: Schema.optional(Schema.String).annotations({ title: 'Seat' }),
});
type FlightProperties = Schema.Schema.Type<typeof FlightProperties>;

const flightValuesFrom = (seg: Segment.Segment): FlightProperties => ({
  airlineName: seg.airline?.name,
  flightNumber: seg.flightNumber,
  originCode: seg.origin?.code,
  destinationCode: seg.destination?.code,
  departAt: seg.departAt,
  arriveAt: seg.arriveAt,
  cabin: seg.cabin,
  seat: seg.seat,
});

const applyFlightValues = (draft: Segment.Segment, values: Partial<FlightProperties>): void => {
  const mutable = draft as { -readonly [K in keyof Segment.Segment]: Segment.Segment[K] };
  if ('airlineName' in values) {
    mutable.airline = { ...(mutable.airline ?? {}), name: values.airlineName ?? undefined };
  }
  if ('flightNumber' in values) {
    mutable.flightNumber = values.flightNumber || undefined;
  }
  if ('originCode' in values) {
    mutable.origin = { ...(mutable.origin ?? {}), code: values.originCode ?? undefined };
  }
  if ('destinationCode' in values) {
    mutable.destination = { ...(mutable.destination ?? {}), code: values.destinationCode ?? undefined };
  }
  if ('departAt' in values) {
    mutable.departAt = values.departAt || undefined;
  }
  if ('arriveAt' in values) {
    mutable.arriveAt = values.arriveAt || undefined;
  }
  if ('cabin' in values) {
    mutable.cabin = values.cabin;
  }
  if ('seat' in values) {
    mutable.seat = values.seat || undefined;
  }
};

//
// Lodging form
//

const LodgingProperties = Schema.Struct({
  propertyName: Schema.optional(Schema.String).annotations({ title: 'Property' }),
  chain: Schema.optional(Schema.String).annotations({ title: 'Chain' }),
  city: Schema.optional(Schema.String).annotations({ title: 'City' }),
  roomType: Schema.optional(Schema.String).annotations({ title: 'Room type' }),
  checkIn: Schema.optional(Schema.String).annotations({ title: 'Check-in' }),
  checkOut: Schema.optional(Schema.String).annotations({ title: 'Check-out' }),
});
type LodgingProperties = Schema.Schema.Type<typeof LodgingProperties>;

const lodgingValuesFrom = (seg: Segment.Segment): LodgingProperties => ({
  propertyName: seg.propertyName,
  chain: seg.operator?.name,
  city: seg.origin?.city ?? seg.destination?.city,
  roomType: seg.roomType,
  checkIn: seg.checkIn,
  checkOut: seg.checkOut,
});

const applyLodgingValues = (draft: Segment.Segment, values: Partial<LodgingProperties>): void => {
  const mutable = draft as { -readonly [K in keyof Segment.Segment]: Segment.Segment[K] };
  if ('propertyName' in values) {
    mutable.propertyName = values.propertyName || undefined;
  }
  if ('chain' in values) {
    mutable.operator = { ...(mutable.operator ?? {}), name: values.chain ?? undefined };
  }
  if ('city' in values) {
    mutable.origin = { ...(mutable.origin ?? {}), city: values.city ?? undefined };
    mutable.destination = { ...(mutable.destination ?? {}), city: values.city ?? undefined };
  }
  if ('roomType' in values) {
    mutable.roomType = values.roomType || undefined;
  }
  if ('checkIn' in values) {
    mutable.checkIn = values.checkIn || undefined;
    mutable.departAt = mutable.checkIn;
  }
  if ('checkOut' in values) {
    mutable.checkOut = values.checkOut || undefined;
    mutable.arriveAt = mutable.checkOut;
  }
};

/** Read-only field rows for kinds without a dedicated edit form. */
const renderModeFields = (segment: Segment.Segment): React.ReactNode => {
  switch (segment.kind) {
    case 'train':
      return (
        <>
          {segment.operator?.name && <Row label='Operator' value={segment.operator.name} />}
          {segment.trainNumber && <Row label='Train' value={segment.trainNumber} />}
          {segment.cabinClass && <Row label='Class' value={segment.cabinClass} />}
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
          {segment.subKind && <Row label='Mode' value={segment.subKind} />}
          {segment.operator?.name && <Row label='Operator' value={segment.operator.name} />}
          {segment.vehicleClass && <Row label='Vehicle' value={segment.vehicleClass} />}
        </>
      );
    case 'activity':
      return (
        <>
          {segment.title && <Row label='Title' value={segment.title} />}
          {segment.venue?.name && <Row label='Venue' value={segment.venue.name} />}
          {segment.operator?.name && <Row label='Operator' value={segment.operator.name} />}
        </>
      );
    default:
      return null;
  }
};

export const SegmentArticle = ({ role, subject }: SegmentArticleProps) => {
  const { t: _t } = useTranslation(meta.id);

  const handleFlightSave = useCallback(
    (values: FlightProperties) => {
      if (typeof subject !== 'object' || subject === null) {
        return;
      }
      Obj.update(subject, (subject) => applyFlightValues(subject as Segment.Segment, values));
    },
    [subject],
  );

  const handleLodgingSave = useCallback(
    (values: LodgingProperties) => {
      if (typeof subject !== 'object' || subject === null) {
        return;
      }
      Obj.update(subject, (subject) => applyLodgingValues(subject as Segment.Segment, values));
    },
    [subject],
  );

  if (typeof subject !== 'object' || subject === null) {
    // Graph-builder sentinel when nothing is selected.
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
  const departAt = formatDate(segment.kind === 'lodging' ? segment.checkIn : segment.departAt);
  const arriveAt = formatDate(segment.kind === 'lodging' ? segment.checkOut : segment.arriveAt);
  const icon = Segment.kindIcon(segment.kind);

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

          {segment.kind === 'flight' && (
            <Form.Root<FlightProperties>
              schema={FlightProperties}
              values={flightValuesFrom(segment)}
              autoSave
              onSave={handleFlightSave}
            >
              <Form.Content>
                <Form.FieldSet />
              </Form.Content>
            </Form.Root>
          )}

          {segment.kind === 'lodging' && (
            <Form.Root<LodgingProperties>
              schema={LodgingProperties}
              values={lodgingValuesFrom(segment)}
              autoSave
              onSave={handleLodgingSave}
            >
              <Form.Content>
                <Form.FieldSet />
              </Form.Content>
            </Form.Root>
          )}

          {segment.kind !== 'flight' && segment.kind !== 'lodging' && (
            <div className='flex flex-col'>
              {route && <Row label='Route' value={route} />}
              {departAt && <Row label='Departs' value={departAt} />}
              {arriveAt && <Row label='Arrives' value={arriveAt} />}
              {renderModeFields(segment)}
              {segment.notes && <Row label='Notes' value={segment.notes} />}
            </div>
          )}
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};
