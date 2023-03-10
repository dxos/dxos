//
// Copyright 2023 DXOS.org
//

import faker from 'faker';
import { Buildings, DotsThree, User } from 'phosphor-react';
import React from 'react';

// TODO(burdon): Add note to @dxos/react-components/plugin
// storybook config (files and modules)
// dxosTheme import

import { Button, DensityProvider, getSize } from '@dxos/react-components';
import '@dxosTheme';

import { Card } from './Card';
import { CardActions } from './CardActions';
import { CardContent } from './CardContent';
import { CardHeader } from './CardHeader';

// TODO(burdon): Copy storybook from @dxos/react-components.
// TODO(burdon): Inputs, Checkbox.
// TODO(burdon): Density.

// TODO(burdon): Column on mobile; no rounded corner if mobile column.

// TODO(burdon): ListItem as CardHeader.

const styles = {
  header: 'bg-zinc-200 dark:bg-zinc-800'
};

// TODO(burdon): Test embedded table/lists (e.g., checkbox in side gutter).

const Test = () => {
  return (
    <div className='flex flex-col w-full md:w-[390px] m-4 space-y-4'>
      <div />
      <DensityProvider density='fine'>
        <Card>
          <CardHeader
            slots={{ root: { className: styles.header } }}
            icon={<User className={getSize(6)} />}
            action={<DotsThree className={getSize(6)} />}
          >
            {faker.lorem.sentence()}
          </CardHeader>
          {/* TODO(burdon): Fade bottom. */}
          <CardContent
            icon={<Buildings className={getSize(6)} />}
            scrollbar
            slots={{
              root: { className: 'h-[160px] text-sm border-b' }
            }}
          >
            {faker.lorem.sentences(32)}
          </CardContent>
          <CardContent gutter>{faker.internet.email()}</CardContent>
          {/* <CardContent gutter>{faker.lorem.sentences(3)}</CardContent> */}
          <CardActions gutter slots={{ root: { className: 'bg-zinc-100' } }}>
            <Button variant='ghost'>OK</Button>
            <Button variant='ghost'>Cancel</Button>
          </CardActions>
        </Card>

        <Card>
          <CardHeader
            slots={{ root: { className: styles.header } }}
            icon={<User className={getSize(6)} />}
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
      </DensityProvider>
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
