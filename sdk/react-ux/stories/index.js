//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { storiesOf } from '@storybook/react';
import { withKnobs } from '@storybook/addon-knobs';

import {
  EditableText,
  Passcode
} from '../src';

import LayoutStory from './LayoutStory';
import LeftLayoutStory from './LeftLayoutStory';
import RightLayoutStory from './RightLayoutStory';
import { WithErrorBoundary } from './ErrorsStory';

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

  .add('EditableText', () => (
    <div>
      <EditableText _variant='h3' value='This is read-only.' disabled />
      <EditableText _variant='h3' value='This is editable.' onUpdate={() => null} />
      <EditableText _variant='h3' placeholder='Enter text.' onUpdate={() => null} />
    </div>
  ))
  .add('Editable Secret', () => <Passcode editable onSubmit={value => console.log(value)} />)
  .add('Secret', () => <Passcode value='123' />)
  .add('Layout', () => <LayoutStory />)
  .add('LeftLayout', () => <LeftLayoutStory />)
  .add('RightLayout', () => <RightLayoutStory />)
  .add('Error Boundary', () => <WithErrorBoundary />);
