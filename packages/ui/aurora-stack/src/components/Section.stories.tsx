//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { List } from '@dxos/aurora';
import { groupSurface, mx, textBlockWidth } from '@dxos/aurora-theme';

import { Section, type SectionProps } from './Section';

export default {
  component: Section as any,
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
