//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';
import { useSelection } from '@dxos/react-ui-attention';
import { type GeoMarker, WorldMap, type WorldMapView } from '@dxos/react-ui-geo';

export type WorldMapSurfaceProps = {
  markers?: GeoMarker[];
  /** The object whose selection picks the highlighted marker: marker ids are the ids it selects. */
  subject?: Obj.Any;
  view?: WorldMapView;
};

/** Renders the `World` role: the requester's markers, highlighted by what is selected in its subject. */
export const WorldMapSurface = ({ markers, subject, view }: WorldMapSurfaceProps) => {
  const selected = useSelection(subject ? Obj.getURI(subject) : undefined, 'single');
  return <WorldMap markers={markers} selected={selected} view={view} />;
};
