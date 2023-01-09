//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import { Story, StoryFn } from '@storybook/react';
import React, { FC } from 'react';

import { Group, mx } from '@dxos/react-components';

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
    const template: StoryFn<typeof Component> = (args) => <Component {...(args as P)} />;

    const story = template.bind({});
    story.args = props;
    // TODO(mykola): Fix type.
    return story as StoryFn<P>;
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

export const Default: StoryFn<{}> = templateForComponent(Template)({});
Default.args = {};
