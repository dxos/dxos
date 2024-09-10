//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { GlobeControl } from './GlobeControl';
import { useMarkers } from '../hooks';
import { type MapType } from '../types';

const MapArticle: FC<{ map: MapType }> = ({ map }) => {
  const markers = useMarkers(map);
  return <GlobeControl markers={markers} classNames='row-span-2 overflow-auto' />;
};

export default MapArticle;
