//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import type { Blockstore } from 'interface-blockstore';
import React, { type ChangeEvent, useEffect, useState } from 'react';

import { faker } from '@dxos/random';
import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { useThemeContext } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  processEditorPayload,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { withTheme } from '@dxos/storybook-utils';

import { create as createBlockstore } from '../blockstore';
import { upload } from '../helpers';

import { image } from './image';

faker.seed(1);
const initialValue = faker.lorem.paragraphs(100);
const instances = {};

const DefaultStory = () => {
  const { themeMode } = useThemeContext();
  const space = useSpace();
  const [blockstore, setBlockstore] = useState<Blockstore>();

  useEffect(() => {
    if (space) {
      console.log('SPACE ID', space.id);
    }

    const create = async () => {
      // NOTE: We don't pass in the URL of the Blob service, so we don't use it.
      const bs = createBlockstore();
      await bs.open();
      setBlockstore(bs);
    };

    create().catch(console.error);
  }, [space]);

  const { parentRef, view, focusAttributes } = useTextEditor(
    () => ({
      initialValue,
      extensions: [
        createBasicExtensions(),
        createMarkdownExtensions(),
        createThemeExtensions({ themeMode, syntaxHighlighting: true }),
        blockstore && space ? [image({ blockstore, instances, space })] : [],
        decorateMarkdown(),
      ],
    }),
    [themeMode, blockstore, space],
  );

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (blockstore) {
        if (space) {
          const info = await upload({ blockstore, file, space });
          if (info && view) {
            processEditorPayload(view, { type: 'image', data: info.url });
          }
        } else {
          console.warn('Space is undefined.');
        }
      } else {
        console.warn("Blockstore hasn't been initialised yet.");
      }
    }
  };

  return (
    <>
      <div className='mb-2'>
        <input type='file' accept='image/*' onChange={onFileChange} />
      </div>
      <div className='w-[50rem]' ref={parentRef} {...focusAttributes} />
    </>
  );
};

const meta = {
  title: 'plugins/plugin-wnfs/image',
  render: DefaultStory,
  decorators: [withTheme, withClientProvider({ createIdentity: true, createSpace: true })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
