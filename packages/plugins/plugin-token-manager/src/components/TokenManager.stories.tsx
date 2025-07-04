//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';

import { TestObjectGenerator } from '@dxos/echo-generator';
import { faker } from '@dxos/random';
import { DataType } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { TokenManager } from './TokenManager';

faker.seed(1);

const generator = new TestObjectGenerator(
  { [DataType.AccessToken.typename]: DataType.AccessToken },
  {
    [DataType.AccessToken.typename]: async () => ({
      token: faker.string.hexadecimal({ length: 32 }),
      source: faker.internet.url(),
      note: faker.lorem.sentence(faker.number.int({ min: 1, max: 9 })),
    }),
  },
);

export const Default = {};

const meta: Meta = {
  title: 'plugins/plugin-token-manager/TokenManager',
  component: TokenManager,
  decorators: [withTheme, withLayout()],
  args: {
    tokens: await Promise.all([...Array(10)].map(() => generator.createObject())),
    onDelete: console.log,
  },
};

export default meta;
