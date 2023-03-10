//
// Copyright 2023 DXOS.org
//

import faker from 'faker';
import { Buildings, DotsThree, User } from 'phosphor-react';
import React from 'react';

import { Button, getSize } from '@dxos/react-components';

import { Card } from './Card';
import { CardActions } from './CardActions';
import { CardContent } from './CardContent';
import { CardHeader } from './CardHeader';

// TODO(burdon): Copy storybook from @dxos/react-components.
// TODO(burdon): Inputs, Checkbox.
// TODO(burdon): Density.

// TODO(burdon): ListItem as CardHeader.

const styles = {
  header: {
    bg: 'bg-zinc-200 dark:bg-zinc-800'
  }
};

const Test = () => {
  return (
    <div className='flex flex-col w-[400px] m-8 space-y-4'>
      <Card>
        <CardHeader
          slots={{ root: { className: styles.header.bg } }}
          icon={<User className={getSize(8)} />}
          action={<DotsThree className={getSize(6)} />}
        >
          {faker.lorem.sentence()}
        </CardHeader>
        <CardContent icon={<Buildings className={getSize(6)} />}>{faker.lorem.sentences(3)}</CardContent>
        <CardContent gutter>{faker.internet.email()}</CardContent>
        <CardContent gutter>{faker.lorem.sentences(3)}</CardContent>
        <CardActions gutter>
          <Button variant='ghost'>OK</Button>
        </CardActions>
      </Card>

      <Card>
        <CardHeader
          slots={{ root: { className: styles.header.bg } }}
          icon={<User className={getSize(8)} />}
          action={<DotsThree className={getSize(6)} />}
        >
          {faker.lorem.sentence()}
        </CardHeader>
        <CardContent gutter>{faker.internet.email()}</CardContent>
        <CardContent gutter>{faker.phone.phoneNumber()}</CardContent>
        <CardActions gutter>
          <Button variant='ghost'>OK</Button>
        </CardActions>
      </Card>

      <Card>
        <CardHeader gutter>{faker.name.findName()}</CardHeader>
        <CardContent gutter>{faker.internet.email()}</CardContent>
      </Card>
    </div>
  );
};

export default {
  component: Card,
  decorators: [
    (Story: any) => (
      <div className='flex flex-col items-center h-screen w-full bg-zinc-100'>
        <Story />
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
