//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { faker } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
import { useSearchListResults } from '../SearchList/hooks';

import { Combobox } from './Combobox';

faker.seed(1234);

const items = faker.helpers.uniqueArray(faker.commerce.productName, 16).sort();

const DefaultStory = () => {
  const itemObjects = React.useMemo(() => items.map((value) => ({ value, label: value })), []);

  const { results, handleSearch } = useSearchListResults({
    items: itemObjects,
  });

  return (
    <Combobox.Root
      placeholder='Nothing selected'
      onValueChange={(value) => {
        console.log('[Combobox.Root.onValueChange]', value);
      }}
    >
      <Combobox.Trigger />
      <Combobox.Content onSearch={handleSearch}>
        <Combobox.Input placeholder='Search...' />
        <Combobox.List>
          {results.map((item) => (
            <Combobox.Item key={item.value} value={item.value} label={item.label} />
          ))}
        </Combobox.List>
        <Combobox.Arrow />
      </Combobox.Content>
    </Combobox.Root>
  );
};

const meta = {
  title: 'ui/react-ui-searchlist/Combobox',
  component: Combobox.Root as any,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ layout: 'column', classNames: 'p-2' })],
  parameters: {
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
