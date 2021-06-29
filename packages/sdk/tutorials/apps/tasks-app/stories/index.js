//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { storiesOf } from '@storybook/react';
import { withKnobs } from '@storybook/addon-knobs';
import { ProfileDialogStory } from './ProfileDialogStory';

storiesOf('Tutorials', module)

  // https://github.com/storybooks/storybook/tree/master/addons/knobs
  .addDecorator(withKnobs)

  // https://storybook.js.org/docs/configurations/options-parameter
  .addParameters({
    options: {
      showPanel: true,
      panelPosition: 'right'
    }
  })
  .add('Profile Dialog', () => <ProfileDialogStory />);
