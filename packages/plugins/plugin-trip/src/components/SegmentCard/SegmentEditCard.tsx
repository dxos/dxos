//
// Copyright 2026 DXOS.org
//

import { format as formatDate } from 'date-fns';
import React, { type ChangeEvent, type MouseEvent, forwardRef, useCallback } from 'react';

import { Obj } from '@dxos/echo';
import { Card, Input, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { Segment } from '#types';

import { type SegmentCardActionHandler } from './SegmentCard';

type FlightEditableCardProps = {
  segment: Segment.Segment;
  onAction?: SegmentCardActionHandler;
};

/** ISO 8601 → `YYYY-MM-DDTHH:mm` in the user's local timezone (the value shape `<input type='datetime-local'>` expects). */
const isoToLocalDateTime = (iso: string | undefined): string => {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return formatDate(date, "yyyy-MM-dd'T'HH:mm");
};

/** `YYYY-MM-DDTHH:mm` (local) → ISO 8601 with timezone. */
const localDateTimeToIso = (value: string): string | undefined => {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

/**
 * Editable card variant for a flight Segment. Surfaces only the most important fields:
 * kind icon + title + delete in the toolbar, route and departure date in the content.
 * The departure date is always editable via `Input.DateTime`.
 */
export const FlightEditableCard = forwardRef<HTMLDivElement, FlightEditableCardProps>(
  ({ segment, onAction }, forwardedRef) => {
    const { t } = useTranslation(meta.id);

    const handleDepartChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        Obj.update(segment, (segment) => {
          // Card is only mounted for flight segments (see SegmentEdit registration).
          if (segment.details._tag === 'flight') {
            segment.details.departAt = localDateTimeToIso(event.target.value);
          }
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
    const icon = Segment.kindIcon(Segment.getKind(segment));
    const departAt = Segment.getDepartAt(segment);

    return (
      <Card.Root fullWidth ref={forwardedRef}>
        <Card.Toolbar>
          <Card.Icon icon={icon} />
          <Card.Title>{title}</Card.Title>
          <Card.ActionIconButton action='delete' onClick={handleDelete} label={t('segment.delete.label')} />
        </Card.Toolbar>
        <Card.Content>
          {route && (
            <Card.Row>
              <Card.Text variant='description'>{route}</Card.Text>
            </Card.Row>
          )}
          <Card.Row icon='ph--calendar--regular'>
            <Input.Root>
              <Input.DateTime
                value={isoToLocalDateTime(departAt)}
                onChange={handleDepartChange}
                placeholder={t('segment.depart.placeholder')}
              />
            </Input.Root>
          </Card.Row>
        </Card.Content>
      </Card.Root>
    );
  },
);

FlightEditableCard.displayName = 'FlightEditable.Card';
