//
// Copyright 2020 DxOS.org
//

import React from 'react';

import BarStory from './BarStory';
import GridStory from './GridStory';
import LayoutStory from './LayoutStory';
import TimeSeriesStory from './TimeSeriesStory';

export default {
  title: 'Widgets'
};

export const withBar = () => <BarStory />;
export const withGrid = () => <GridStory />;
export const withLayout = () => <LayoutStory />;
export const withTimeSeries = () => <TimeSeriesStory />;
