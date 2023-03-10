//
// Copyright 2023 DXOS.org
//

import { DotsThree, User } from 'phosphor-react';
import React from 'react';

import { Button, getSize } from '@dxos/react-components';

import { Card } from './Card';
import { CardActions } from './CardActions';
import { CardContent } from './CardContent';
import { CardHeader } from './CardHeader';

// TODO(burdon): Look at r-c controls.
// TODO(burdon): Density.

const TestCard = () => {
  return (
    <Card>
      <CardHeader icon={<User className={getSize(6)} />} action={<DotsThree className={getSize(6)} />}>
        Test Card
      </CardHeader>
      <CardContent gutter>A</CardContent>
      <CardContent gutter>B</CardContent>
      <CardContent gutter>C</CardContent>
      <CardActions gutter>
        <Button>OK</Button>
      </CardActions>
    </Card>
  );
};

const Test = () => {
  return (
    <div className='flex flex-col space-y-2'>
      <TestCard />
      <TestCard />
      <TestCard />
    </div>
  );
};

export default {
  component: Card,
  decorators: [
    (Story: any) => (
      <div className='flex flex-col items-center h-screen w-full bg-zinc-100'>
        <div className='m-8 w-[300px]'>
          <Story />
        </div>
      </div>
    )
  ],
  parameters: {
    layout: 'fullscreen'
  }
};

export const Default = {
  render: () => <Test />
};
