//
// Copyright 2020 DXOS.org
//

import { withKnobs } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react';
import React from 'react';

import LayoutStory from './LayoutStory';
import LeftLayoutStory from './LeftLayoutStory';
import RightLayoutStory from './RightLayoutStory';

storiesOf('UX', module)

  // https://github.com/storybooks/storybook/tree/master/addons/knobs
  .addDecorator(withKnobs)

  // https://storybook.js.org/docs/configurations/options-parameter
  .addParameters({
    options: {
      showPanel: true,
      panelPosition: 'right'
    }
  })

  .add('Layout', () => <LayoutStory />)
  .add('LeftLayout', () => <LeftLayoutStory />)
  .add('RightLayout', () => <RightLayoutStory />);
