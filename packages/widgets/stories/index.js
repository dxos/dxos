//
// Copyright 2020 DxOS.org
//

import React from 'react';

import BarStory from './BarStory';
import GridStory from './GridStory';
import LayoutStory from './LayoutStory';
import NetworkGraphStory from './NetworkGraphStory';
import OrbitStory from './OrbitStory';
import SimpleGraphStory from './SimpleGraphStory';
import TimeSeriesStory from './TimeSeriesStory';

export default {
  title: 'Widgets'
};

export const withBar = () => <BarStory />;
export const withGrid = () => <GridStory />;
export const withLayout = () => <LayoutStory />;
export const withNetworkGraph = () => <NetworkGraphStory />;
export const withSimpleGraph = () => <SimpleGraphStory />;
export const withTimeSeries = () => <TimeSeriesStory />;
export const withOrbit = () => <OrbitStory />;
