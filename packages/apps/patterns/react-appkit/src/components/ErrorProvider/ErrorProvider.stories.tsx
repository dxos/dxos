//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import { ComponentStory, Story } from '@storybook/react';
import React, { FC } from 'react';

import { Button } from '@dxos/react-ui';

import { ErrorProvider } from './ErrorProvider';

export default {
  title: 'react-uikit/ErrorProvider',
  component: ErrorProvider
};

const UnhandledRejectionThrower = () => {
  return (
    <Button
      onClick={() => {
        void new Promise((resolve, reject) => {
          throw new Error('Broken promise.');
        });
      }}
    >
      Throw an unhandled rejection
    </Button>
  );
};

const Template = (_args: {}) => (
  <ErrorProvider>
    <div className='flex flex-col gap-4'>
      <UnhandledRejectionThrower />
    </div>
  </ErrorProvider>
);

// TODO(wittjosiah): Factor out.
const templateForComponent =
  <P extends {}>(Component: FC<P>) =>
  (props: P): Story<P> => {
    const template: ComponentStory<typeof Component> = (args) => <Component {...args} />;

    const story = template.bind({});
    story.args = props;
    return story;
  };

export const Default = templateForComponent(Template)({});
Default.args = {};
