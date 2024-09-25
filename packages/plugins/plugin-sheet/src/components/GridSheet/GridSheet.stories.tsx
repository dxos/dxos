//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { getSpace } from '@dxos/client/echo';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { GridSheet } from './GridSheet';
import { useTestSheet, withGraphDecorator } from '../../testing';

export default {
  title: 'plugin-sheet/GridSheet',
  component: GridSheet,
  decorators: [withTheme, withLayout({ fullscreen: true, tooltips: true, classNames: 'inset-4' }), withGraphDecorator],
  parameters: { layout: 'fullscreen' },
};

export const Basic = () => {
  const sheet = useTestSheet();
  const space = getSpace(sheet);
  return !sheet || !space ? null : <GridSheet sheet={sheet} space={space} />;
};
