//
// Copyright 2025 DXOS.org
//

import React, { type Ref, useCallback, forwardRef } from 'react';

import { type DataType } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { useTranslation } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-card';
import { Form } from '@dxos/react-ui-form';
import { Focus } from '@dxos/react-ui-list';
import { Mosaic } from '@dxos/react-ui-mosaic';
import { getStyles } from '@dxos/ui-theme';

import { Segment } from '../../schema';
import { TRIP_PLUGIN } from '../../types';
import { getSegmentDetails } from './segment-details';

export type SegmentCardProps = {
  segment: DataType.Expando;
  current?: boolean;
  onDelete?: (segment: DataType.Expando) => void;
};

export const SegmentCard = forwardRef<HTMLDivElement, SegmentCardProps>(({ segment, current, onDelete }, forwardedRef: Ref<HTMLDivElement>) => {
  const { t } = useTranslation(TRIP_PLUGIN);
  const { icon, title, hue, flightDetails } = getSegmentDetails(segment);
  const iconStyles = hue ? getStyles(hue) : undefined;

  const handleDelete = useCallback(() => onDelete?.(segment), [onDelete, segment]);
  const handleCurrentChange = useCallback(() => {}, []);

  const location = { path: segment.id };
  const data = {};

  invariant(segment.id);

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
            <Card.Icon icon={icon} classNames={iconStyles?.fg} />
            <Card.Title>{title}</Card.Title>
            <Card.ActionIconButton action='delete' onClick={handleDelete} label={t('segment.delete.label')} />
          </Card.Header>
          {flightDetails ? (
            <Card.Body>
              <Form.Root
                schema={Segment.FlightDetails}
                defaultValues={flightDetails}
                layout='static'
              />
            </Card.Body>
          ) : null}
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
});
