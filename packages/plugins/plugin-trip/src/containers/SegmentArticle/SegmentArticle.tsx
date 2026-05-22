//
// Copyright 2026 DXOS.org
//

import { format } from 'date-fns';
import React from 'react';

import { Icon, Panel, useTranslation } from '@dxos/react-ui';
import { useSelected } from '@dxos/react-ui-attention';

import { meta } from '#meta';
import { Segment, type Trip } from '#types';

export type SegmentArticleProps = {
  role?: string;
  attendableId: string;
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

const renderModeFields = (segment: Segment.Any): React.ReactNode => {
  switch (segment._tag) {
    case 'flight':
      return (
        <>
          {segment.airline?.name && <Row label='Airline' value={segment.airline.name} />}
          {segment.flightNumber && <Row label='Flight' value={segment.flightNumber} />}
          {segment.cabin && <Row label='Cabin' value={segment.cabin} />}
          {segment.terminalFrom && <Row label='Terminal (from)' value={segment.terminalFrom} />}
          {segment.terminalTo && <Row label='Terminal (to)' value={segment.terminalTo} />}
          {segment.gateFrom && <Row label='Gate (from)' value={segment.gateFrom} />}
          {segment.gateTo && <Row label='Gate (to)' value={segment.gateTo} />}
          {segment.seat && <Row label='Seat' value={segment.seat} />}
        </>
      );
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
  }
};

export const SegmentArticle = ({ role, attendableId, companionTo: trip }: SegmentArticleProps) => {
  const { t: _t } = useTranslation(meta.id);
  const selectedId = useSelected(attendableId, 'single');
  const segment = trip.segments?.find((s) => s.id === selectedId);

  if (!segment) {
    return (
      <Panel.Root role={role} className='dx-document'>
        <Panel.Content asChild>
          <div className='p-4 text-description'>Select a segment to view details.</div>
        </Panel.Content>
      </Panel.Root>
    );
  }

  const title = Segment.getTitle(segment);
  const route = Segment.getRoute(segment);
  const departAt = formatDate(segment._tag === 'lodging' ? segment.checkIn : segment.departAt);
  const arriveAt = formatDate(segment._tag === 'lodging' ? segment.checkOut : segment.arriveAt);
  const icon = Segment.kindIcon(segment._tag);

  return (
    <Panel.Root role={role} className='dx-document'>
      <Panel.Content asChild>
        <div className='p-4 flex flex-col gap-3'>
          <div className='flex items-center gap-2'>
            <Icon icon={icon} size={6} />
            <h2 className='text-lg font-medium'>{title}</h2>
            <span className='ml-2 text-xs text-description px-2 py-0.5 rounded bg-attentionSurface'>
              {segment.status}
            </span>
          </div>
          <div className='flex flex-col'>
            {route && <Row label='Route' value={route} />}
            {departAt && <Row label={segment._tag === 'lodging' ? 'Check-in' : 'Departs'} value={departAt} />}
            {arriveAt && <Row label={segment._tag === 'lodging' ? 'Check-out' : 'Arrives'} value={arriveAt} />}
            {renderModeFields(segment)}
            {segment.notes && <Row label='Notes' value={segment.notes} />}
          </div>
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};
