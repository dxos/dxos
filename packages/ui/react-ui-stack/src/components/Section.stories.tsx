//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { List } from '@dxos/react-ui';
import { groupSurface, mx, textBlockWidth } from '@dxos/react-ui-theme';
import { withTheme } from '@dxos/storybook-utils';

import { Section, type SectionProps } from './Section';

export default {
  component: Section as any,
  decorators: [withTheme],
  args: {
    id: 'section',
    title: 'Section',
  },
  render: (args: SectionProps) => {
    return (
      <List classNames={textBlockWidth}>
        <Section {...args}>
          <div className={mx('h-full p-2', groupSurface)}>Content Area</div>
        </Section>
      </List>
    );
  },
};

export const Default = {};

export const ActiveRearrange = {
  args: { active: 'rearrange' },
};

export const ActiveOrigin = {
  args: { active: 'origin' },
};

export const ActiveDestination = {
  args: { active: 'destination' },
};

export const ActiveOverlay = {
  args: { active: 'overlay' },
};
