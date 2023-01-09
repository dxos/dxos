//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import { ComponentStory, Story } from '@storybook/react';
import React, { FC } from 'react';

import { Group, mx } from '@dxos/react-ui';

import { FolderHierarchy } from './FolderHierarchy';

export default {
  title: 'kai/FolderHierarchy',
  component: FolderHierarchy,
  argTypes: {}
};

// TODO(burdon): Factor out?
const templateForComponent =
  <P extends {}>(Component: FC<P>) =>
  (props: P): Story<P> => {
    const template: ComponentStory<typeof Component> = (args) => <Component {...args} />;

    const story = template.bind({});
    story.args = props;
    return story;
  };

const Template = (args: any) => {
  return (
    <Group
      elevation={5}
      label={{
        level: 1,
        className: 'mb-4 text-3xl'
      }}
      className={mx('p-5 rounded-xl max-w-md mx-auto my-4')}
    >
      <FolderHierarchy {...args} />
    </Group>
  );
};

export const Default = templateForComponent(Template)({});
Default.args = {};
