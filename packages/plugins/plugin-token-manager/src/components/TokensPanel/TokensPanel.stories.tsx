//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { TestObjectGenerator } from '@dxos/echo-generator';
import { random } from '@dxos/random';
import { Loading, withTheme } from '@dxos/react-ui/testing';
import { AccessToken } from '@dxos/types';

import { TokensPanel, type TokensPanelProps } from './TokensPanel';
import { translations } from '../../translations';

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

const DefaultStory = (props: Omit<TokensPanelProps, 'tokens' | 'spaceId'>) => {
  const [tokens, setTokens] = useState<AccessToken.AccessToken[]>([]);
  useEffect(() => {
    void Promise.all([...Array(5)].map(() => generator.createObject())).then((generated) =>
      setTokens(generated as AccessToken.AccessToken[]),
    );
  }, []);

  if (tokens.length === 0) {
    return <Loading data={{ tokens: tokens.length }} />;
  }

  return <TokensPanel tokens={tokens} spaceId={'space:test' as any} {...props} />;
};

const meta = {
  title: 'plugins/plugin-token-manager/components/TokensPanel',
  decorators: [withTheme()],
  component: DefaultStory,
  parameters: {
    translations,
  },
  args: {
    adding: false,
    onNew: () => console.log('onNew'),
    onCancel: () => console.log('onCancel'),
    onAdd: (form: any) => console.log('onAdd', form),
    onDelete: (token: any) => console.log('onDelete', token),
    onAddAccessToken: (token: any) => console.log('onAddAccessToken', token),
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

// Show form view by default (list view requires client context for NewTokenSelector).
export const Default: Story = {
  args: {
    // TODO(burdon): Need to mock OAuth to support NewTokenSelector.
    adding: true,
  },
};
