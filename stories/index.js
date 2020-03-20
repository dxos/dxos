//
// Copyright 2018 DxOS
//

import React from 'react';
import { storiesOf } from '@storybook/react';
import { withKnobs, boolean } from '@storybook/addon-knobs';

import BarStory from './BarStory';
import FabricStory from './FabricStory';
import GlobeStory from './GlobeStory';
import GridStory from './GridStory';
import GroupsStory from './GroupsStory';
import IsometricStory from './IsometricStory';
import LayoutStory from './LayoutStory';
import NetworkGraphStory from './NetworkGraphStory';
import OrbitStory from './OrbitStory';
import SimpleGraphStory from './SimpleGraphStory';
import TimeSeriesStory from './TimeSeriesStory';

storiesOf('Components', module)

  // TODO(burdon): some knobs don't work unless they are hoisted to the outer container.
  // https://github.com/storybooks/storybook/tree/master/addons/knobs
  .addDecorator(withKnobs)

  .add('Bar',
    () => <BarStory />)
  .add('Fabric',
    () => <FabricStory {...FabricStory.props} />)
  .add('Globe',
    () => <GlobeStory {...GlobeStory.props} />)
  .add('Grid',
    () => <GridStory />)
  .add('Groups',
    () => <GroupsStory running={boolean('Running', true)} />)
  .add('Isometric',
    () => <IsometricStory />)
  .add('Layout',
    () => <LayoutStory />)
  .add('NetworkGraphStory',
    () => <NetworkGraphStory {...NetworkGraphStory.props} running={boolean('Running', false)} />)
  .add('SimpleGraphStory',
    () => <SimpleGraphStory {...SimpleGraphStory.props} running={boolean('Running', true)} />)
  .add('Orbit',
    () => <OrbitStory />)
  .add('TimeSeries',
    () => <TimeSeriesStory />)

  // https://storybook.js.org/docs/configurations/options-parameter
  .addParameters({
    options: {
      panelPosition: 'right'
    }
  });
