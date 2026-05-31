//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { useSelected } from '@dxos/react-ui-attention';

import { TripMapView, type TripMapVariant } from '#components';
import { Trip } from '#types';

export type TripMapArticleProps = AppSurface.ObjectArticleProps<Trip.Trip>;

/**
 * Self-contained map surface for a Trip. Resolves the trip's segments
 * reactively, reads the current segment selection from the shared attention
 * context via `useSelected`, and renders {@link TripMapView} in either globe or
 * map variant (toggled by the geo `Action` control). Selecting a segment on the
 * map writes the single selection back so the segment stack stays in sync.
 */
export const TripMapArticle = ({ subject, attendableId }: TripMapArticleProps) => {
  const { invokePromise } = useOperationInvoker();

  // Subscribe to mutations so segment edits re-render the map.
  const reactiveSubject = Obj.isObject(subject) ? subject : undefined;
  const [snapshot] = useObject(reactiveSubject);
  // useObject yields a structurally-narrow Snapshot; widen back to the live type for reads (same as TripArticle).
  const trip = (snapshot ?? subject) as Trip.Trip;

  const id = attendableId ?? Obj.getURI(subject);
  const currentId = useSelected(id, 'single');
  const [variant, setVariant] = useState<TripMapVariant>('globe');

  const segments = useMemo(() => Trip.getSegments(trip), [trip.segments]);

  const handleSelect = useCallback(
    (segmentId: string) => {
      void invokePromise(LayoutOperation.Select, {
        contextId: id,
        subject: { mode: 'single', id: segmentId },
      });
    },
    [id, invokePromise],
  );

  const handleVariantToggle = useCallback(() => {
    setVariant((value) => (value === 'globe' ? 'map' : 'globe'));
  }, []);

  return (
    <TripMapView
      variant={variant}
      segments={segments}
      selectedSegmentId={currentId}
      onSelect={handleSelect}
      onVariantToggle={handleVariantToggle}
    />
  );
};
