//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { TestObjectGenerator } from '@dxos/echo-generator';
import { faker } from '@dxos/random';
import { withTheme() } from '@dxos/react-ui/testing';
import { AccessToken } from '@dxos/types';

import { TokenManager, type TokenManagerProps } from './TokenManager';

faker.seed(1);

const generator = new TestObjectGenerator(
  { [AccessToken.AccessToken.typename]: AccessToken.AccessToken },
  {
    [AccessToken.AccessToken.typename]: async () => ({
      token: faker.string.hexadecimal({ length: 32 }),
      source: faker.internet.url(),
      note: faker.lorem.sentence(faker.number.int({ min: 1, max: 9 })),
    }),
  },
);

// TODO(wittjosiah): ECHO objects don't work when passed via Storybook args.
const TokenManagerStory = (props: Omit<TokenManagerProps, 'tokens'>) => {
  const [tokens, setTokens] = useState<AccessToken.AccessToken[]>([]);
  useEffect(() => {
    void Promise.all([...Array(10)].map(() => generator.createObject())).then((generated) =>
      setTokens(generated as AccessToken.AccessToken[]),
    );
  }, []);
  if (tokens.length === 0) {
    return <div>Loading tokens...</div>;
  }
  return <TokenManager tokens={tokens} {...props} />;
};

const meta = {
  title: 'plugins/plugin-token-manager/TokenManager',
  decorators: [withTheme()],
  component: TokenManagerStory,
  args: {
    onDelete: console.log,
  },
} satisfies Meta<typeof TokenManagerStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
