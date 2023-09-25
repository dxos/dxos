//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { faker } from '@faker-js/faker';
import { Buildings, DotsThree, Envelope, User } from '@phosphor-icons/react';
import React from 'react';

// TODO(burdon): Add note to @dxos/react-components/plugin
// storybook config (files and modules)
// dxosTheme import

import { Button, DensityProvider } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';

import { Card } from './Card';
import { CardActions } from './CardActions';
import { CardContent } from './CardContent';
import { CardHeader } from './CardHeader';

// TODO(burdon): Copy storybook structure from @dxos/react-components.

// TODO(burdon): IconButton.
// TODO(burdon): Density: Input, Checkbox.
// TODO(burdon): ListItem as CardHeader.

// TODO(burdon): Column on mobile; no rounded corner if mobile column.

// TODO(burdon): Factor out default semantic colors.

const styles = {
  header: 'bg-blue-300 dark:bg-zinc-800',
};

// TODO(burdon): Test embedded table/lists (e.g., checkbox in side gutter).

const Test = () => {
  return (
    <div className='flex flex-col w-full md:w-[390px] m-4 space-y-8'>
      <DensityProvider density='fine'>
        <Card slots={{ root: { className: 'text-sm' } }}>
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
              root: { className: 'h-[160px]' },
              body: { className: 'pt-2.5' },
            }}
          >
            {faker.lorem.sentences(32)}
          </CardContent>
          <CardContent
            icon={<Envelope className={getSize(6)} />}
            slots={{
              body: { className: 'pt-2.5' },
            }}
          >
            {faker.internet.email()}
          </CardContent>
          <CardContent gutter>{faker.lorem.sentences(3)}</CardContent>
          <CardActions gutter slots={{ root: { className: 'bg-zinc-100' } }}>
            <Button variant='ghost'>OK</Button>
            <Button variant='ghost'>Cancel</Button>
          </CardActions>
        </Card>

        <Card>
          <CardHeader icon={<User className={getSize(6)} />} action={<DotsThree className={getSize(6)} />}>
            {faker.lorem.sentence()}
          </CardHeader>
          <CardContent gutter>{faker.lorem.sentences(2)}</CardContent>
          <CardContent gutter>{faker.internet.email()}</CardContent>
          <CardContent gutter>{faker.phone.number()}</CardContent>
        </Card>

        <Card>
          <CardHeader action={<DotsThree className={getSize(6)} />}>{faker.lorem.sentence()}</CardHeader>
          <CardContent>{faker.lorem.sentences(5)}</CardContent>
          <CardActions>
            <Button variant='ghost'>OK</Button>
          </CardActions>
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
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  render: () => <Test />,
};
