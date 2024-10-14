//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { S } from '@dxos/echo-schema';
import { useTranslation } from '@dxos/react-ui';
import { ghostHover, mx } from '@dxos/react-ui-theme';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { List, type ListRootProps } from './List';
import { view, TestPopup } from '../../testing';
import translations, { translationKey } from '../../translations';
import { FieldSchema, type FieldType } from '../../types';

const Story = (props: ListRootProps<FieldType>) => {
  const { t } = useTranslation(translationKey);
  const grid = 'grid grid-cols-[32px_1fr_32px] min-bs-[2.5rem] rounded';
  return (
    <TestPopup>
      <List.Root<FieldType> {...props} dragPreview>
        {({ items }) => (
          <>
            <div className='w-full'>
              <div role='heading' className={grid}>
                <div />
                <div className='flex items-center text-sm'>{t('field path label')}</div>
              </div>

              <div role='list' className='flex flex-col w-full'>
                {items.map((item) => (
                  <List.Item<FieldType> key={item.id} item={item} classNames={mx(grid, ghostHover)}>
                    <List.ItemDragHandle />
                    <List.ItemTitle
                      onClick={() => {
                        console.log('select', item.id);
                      }}
                    >
                      {item.path}
                    </List.ItemTitle>
                    <List.ItemDeleteButton
                      onClick={() => {
                        console.log('delete', item.id);
                      }}
                    />
                  </List.Item>
                ))}
              </div>
            </div>

            <List.ItemDragPreview<FieldType>>
              {({ item }) => (
                <List.ItemWrapper classNames={mx(grid, 'bg-modalSurface border border-separator')}>
                  <List.ItemDragHandle />
                  <div className='flex items-center'>{item.path}</div>
                </List.ItemWrapper>
              )}
            </List.ItemDragPreview>
          </>
        )}
      </List.Root>
    </TestPopup>
  );
};

export default {
  title: 'react-ui-data/List',
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'flex p-4 justify-center' })],
  parameters: {
    translations,
  },
  render: Story,
};

export const Default = {
  args: {
    items: view.fields,
    isItem: S.is(FieldSchema),
  } satisfies ListRootProps<FieldType>,
};
