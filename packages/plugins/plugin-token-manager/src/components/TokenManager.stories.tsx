//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';

import { TestObjectGenerator } from '@dxos/echo-generator';
import { faker } from '@dxos/random';
import { AccessTokenType } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { TokenManager } from './TokenManager';

faker.seed(1);

const generator = new TestObjectGenerator(
  { [AccessTokenType.typename]: AccessTokenType },
  {
    [AccessTokenType.typename]: async () => ({
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
  decorators: [withTheme, withLayout({ tooltips: true })],
  args: {
    tokens: await Promise.all([...Array(10)].map(() => generator.createObject())),
    onDelete: console.log,
  },
};

export default meta;
