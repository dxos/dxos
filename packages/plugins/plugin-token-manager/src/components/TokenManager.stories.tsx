//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { TestObjectGenerator } from '@dxos/echo-generator';
import { faker } from '@dxos/random';
import { DataType } from '@dxos/schema';

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

export const Default: Story = {};

const meta = {
  title: 'plugins/plugin-token-manager/TokenManager',
  component: TokenManager,
  args: {
    tokens: await Promise.all([...Array(10)].map(() => generator.createObject())),
    onDelete: console.log,
  },
} satisfies Meta<typeof TokenManager>;

export default meta;

type Story = StoryObj<typeof meta>;
