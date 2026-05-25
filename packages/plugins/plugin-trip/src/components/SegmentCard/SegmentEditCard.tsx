//
// Copyright 2026 DXOS.org
//

import { format } from 'date-fns';
import React, { type MouseEvent, forwardRef, useCallback, useEffect, useState } from 'react';

import { Obj } from '@dxos/echo';
import { Card, DatePicker, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { Segment } from '#types';

import { type SegmentCardActionHandler } from './SegmentCard';

type FlightEditCardProps = {
  segment: Segment.Segment;
  onAction?: SegmentCardActionHandler;
};

/**
 * Editable card variant for a flight Segment. Surfaces only the most important fields:
 * kind icon + title + delete in the toolbar, route and departure date in the content.
 * The departure date becomes editable (via DatePicker) when `segment.status === 'tentative'`;
 * otherwise it renders as static text.
 */
export const FlightEditCard = forwardRef<HTMLDivElement, FlightEditCardProps>(({ segment, onAction }, forwardedRef) => {
  const { t } = useTranslation(meta.id);

  const editable = segment.status === 'tentative';
  const [departDate, setDepartDate] = useState<Date | undefined>(() => Segment.parseDate(segment.departAt));

  // Re-sync if the component is reused for a different segment.
  useEffect(() => {
    setDepartDate(Segment.parseDate(segment.departAt));
  }, [segment.id, segment.departAt]);

  const handleDepartChange = useCallback(
    (next: Date | undefined) => {
      setDepartDate(next);
      Obj.update(segment, (segment) => {
        segment.departAt = next ? next.toISOString() : undefined;
      });
    },
    [segment],
  );

  const handleDelete = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      onAction?.({ type: 'delete', segmentId: segment.id });
    },
    [onAction, segment.id],
  );

  const title = Segment.getTitle(segment);
  const route = Segment.getRoute(segment);
  const icon = Segment.kindIcon(segment.kind);
  const isCancelled = segment.status === 'cancelled';

  return (
    <Card.Root fullWidth ref={forwardedRef} classNames={isCancelled ? 'opacity-40' : undefined}>
      <Card.Toolbar>
        <Card.Icon icon={icon} />
        <Card.Title classNames={isCancelled ? 'line-through' : undefined}>{title}</Card.Title>
        <Card.ActionIconButton action='delete' onClick={handleDelete} label={t('segment.delete.label')} />
      </Card.Toolbar>
      <Card.Content>
        {route && (
          <Card.Row>
            <Card.Text variant='description'>{route}</Card.Text>
          </Card.Row>
        )}
        <Card.Row icon='ph--calendar--regular'>
          {editable ? (
            <DatePicker.Root mode='single' value={departDate} onValueChange={handleDepartChange}>
              <DatePicker.Trigger icon={false} format='PPp' placeholder={t('segment.depart.placeholder')} />
              <DatePicker.Content>
                <DatePicker.Calendar />
              </DatePicker.Content>
            </DatePicker.Root>
          ) : (
            <Card.Text variant='description'>
              {departDate ? format(departDate, 'PPp') : t('segment.depart.placeholder')}
            </Card.Text>
          )}
        </Card.Row>
      </Card.Content>
    </Card.Root>
  );
});

FlightEditCard.displayName = 'FlightEditCard';
