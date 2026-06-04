//
// Copyright 2026 DXOS.org
//

import { format } from 'date-fns';
import React, { type MouseEvent, forwardRef, useCallback } from 'react';

import { Obj } from '@dxos/echo';
import { Card, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import { getStyles } from '@dxos/ui-theme';
import { trim } from '@dxos/util';

import { meta } from '#meta';
import { Segment } from '#types';

/**
 * Read-only layout for a flight `Segment.FlightDetails`. Rendered inside the tile
 * via `Form.Layout` with `layout='static' readonly`, so each cell collapses to a
 * truncated plain-text value rather than an input.
 */
const FLIGHT_LAYOUT = trim`
  <grid cols="2">
    <field name="number"/>
    <field name="serviceClass"/>
    <field name="departAt"/>
    <field name="arriveAt"/>
    <field name="origin"/>
    <field name="destination"/>
  </grid>
`;

export type SegmentCardAction = { segmentId: string } & (
  | { type: 'current' }
  | { type: 'select' }
  | { type: 'deselect' }
  | { type: 'delete' }
);

export type SegmentCardActionHandler = (action: SegmentCardAction) => void;

type SegmentTileData = {
  segment: Segment.Segment;
  onAction?: SegmentCardActionHandler;
};

type SegmentTileProps = Pick<MosaicTileProps<SegmentTileData>, 'data' | 'location' | 'current'>;

/**
 * Mosaic tile for a Segment. Follows the Card primitives:
 *   Card.Root
 *     Card.Header  → kind icon + title + delete (Card.ActionIconButton action='delete')
 *     Card.Body  → optional Route and Date rows
 *
 * Selection / current state is wired through `Mosaic.Tile asChild` + `Focus.Item`
 * so the host `Mosaic.Container` drives the visual `dx-current` / `dx-selected`
 * states uniformly across the stack.
 */
export const SegmentTile = forwardRef<HTMLDivElement, SegmentTileProps>(({ data, location, current }, forwardedRef) => {
  const { segment, onAction } = data;
  const { setCurrentId, setSelected } = useMosaicContainer('SegmentTile');
  const { t } = useTranslation(meta.id);

  const handleCurrentChange = useCallback(() => {
    setCurrentId(segment.id);
    setSelected(segment.id, true);
  }, [segment.id, setCurrentId, setSelected]);

  const handleDelete = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      // Don't let the delete button propagate as a select / current change.
      event.stopPropagation();
      onAction?.({ type: 'delete', segmentId: segment.id });
    },
    [onAction, segment.id],
  );

  const title = Segment.getTitle(segment);
  const route = Segment.getRoute(segment);
  const date = Segment.getPrimaryDate(segment);
  const kind = Segment.getKind(segment);
  const icon = Segment.kindIcon(kind);
  // Tint the kind glyph with the object's type-level hue (Segment.IconAnnotation).
  const hue = Obj.getIcon(segment)?.hue;
  const iconStyles = hue ? getStyles(hue) : undefined;
  const flightDetails = segment.details._tag === 'flight' ? segment.details : undefined;

  return (
    <Mosaic.Tile
      asChild
      classNames='p-2 rounded-md dx-hover dx-current dx-selected border border-subdued-separator'
      id={segment.id}
      data={data}
      location={location}
    >
      <Focus.Item asChild current={current} onCurrentChange={handleCurrentChange}>
        <Card.Root fullWidth border={false} ref={forwardedRef}>
          <Card.Header>
            <Card.Icon icon={icon} classNames={iconStyles?.text} />
            <Card.Title>{title}</Card.Title>
            <Card.ActionIconButton action='delete' onClick={handleDelete} label={t('segment.delete.label')} />
          </Card.Header>
          {flightDetails ? (
            <Card.Body>
              <Form.Root
                schema={Segment.FlightDetails}
                defaultValues={flightDetails}
                layout='static'
                readonly
                tooltips={false}
              >
                {/*
                 * No `Form.Viewport`: it would nest its own full-bleed Column +
                 * gutter, so the fields wouldn't line up with the header. Rendering
                 * `Form.Content` directly lets `withColumn.center()` place the body
                 * in the Card's content column — aligned under the title, matching
                 * the `Card.Row` route/date branch.
                 */}
                <Form.Content>
                  <Form.Layout template={FLIGHT_LAYOUT} />
                </Form.Content>
              </Form.Root>
            </Card.Body>
          ) : (
            (route || date) && (
              <Card.Body>
                {route && (
                  <Card.Row>
                    <Card.Text variant='description'>{route}</Card.Text>
                  </Card.Row>
                )}
                {date && (
                  <Card.Row icon='ph--calendar--regular'>
                    <Card.Text variant='description'>{format(date, 'PPp')}</Card.Text>
                  </Card.Row>
                )}
              </Card.Body>
            )
          )}
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
});

SegmentTile.displayName = 'SegmentTile';
