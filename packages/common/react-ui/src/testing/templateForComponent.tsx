//
// Copyright 2022 DXOS.org
//

import { ComponentStory, Story } from '@storybook/react';
import React, { FC } from 'react';

export const templateForComponent =
  <P extends {}>(Component: FC<P>) =>
    (props: P): Story<P> => {
      const template: ComponentStory<typeof Component> = (args) => (
        <Component {...args} />
      );

      const story = template.bind({});
      story.args = props;
      return story;
    };
