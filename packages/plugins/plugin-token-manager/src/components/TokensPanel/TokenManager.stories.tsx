//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { TestObjectGenerator } from '@dxos/echo-generator';
import { random } from '@dxos/random';
import { Loading, withTheme } from '@dxos/react-ui/testing';
import { AccessToken } from '@dxos/types';

import { translations } from '../../translations';
import { TokenManager, type TokenManagerProps } from './TokenManager';

random.seed(1);

const generator = new TestObjectGenerator(
  { [AccessToken.AccessToken.typename]: AccessToken.AccessToken },
  {
    [AccessToken.AccessToken.typename]: async () => ({
      token: random.string.hexadecimal({ length: 32 }),
      source: random.internet.url(),
      note: random.lorem.sentence(random.number.int({ min: 1, max: 9 })),
    }),
  },
);

const TokenManagerStory = (props: Omit<TokenManagerProps, 'tokens'>) => {
  const [tokens, setTokens] = useState<AccessToken.AccessToken[]>([]);
  useEffect(() => {
    void Promise.all([...Array(10)].map(() => generator.createObject())).then((generated) =>
      setTokens(generated as AccessToken.AccessToken[]),
    );
  }, []);

  if (tokens.length === 0) {
    return <Loading data={{ tokens: tokens.length }} />;
  }

  return <TokenManager tokens={tokens} {...props} />;
};

const meta = {
  title: 'plugins/plugin-token-manager/components/TokenManager',
  decorators: [withTheme()],
  component: TokenManagerStory,
  parameters: {
    translations,
  },
  args: {
    onDelete: console.log,
  },
} satisfies Meta<typeof TokenManagerStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
