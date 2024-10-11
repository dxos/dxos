//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Blockstore } from 'interface-blockstore';
import React, { useEffect, useState } from 'react';

import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { useThemeContext } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { image } from './image';
import { create as createBlockstore } from '../blockstore';

// TODO:
// Use `upload` to upload the `File` contents from the input element.
// Uploaded images are rendered as a grid.

const Story = () => {
  const space = useSpace();

  const [blockstore, setBlockstore] = useState<Blockstore>();
  const [file, setFile] = useState<File>();

  useEffect(() => {
    const create = async () => {
      const bs = createBlockstore();
      await bs.open();
      setBlockstore(bs);
    };

    create().catch(console.error);
  }, [space]);

  useEffect(() => {}, [file]);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0]);
  };

  const { themeMode } = useThemeContext();
  const { parentRef, focusAttributes } = useTextEditor(
    () => ({
      initialValue: '',
      extensions: [
        createBasicExtensions(),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode, syntaxHighlighting: true }),
        blockstore && space ? [image({ blockstore, space })] : [],
        decorateMarkdown(),
      ],
    }),
    [themeMode],
  );

  return (
    <>
      <div className='mb-2'>
        <input type='file' accept='image/*' onChange={onFileChange} />
      </div>
      <div className='w-[50rem]' ref={parentRef} {...focusAttributes} />
    </>
  );
};

export default {
  title: 'plugin-wnfs/image',
  render: Story,
  decorators: [withClientProvider({ createIdentity: true, createSpace: true }), withTheme, withLayout()],
};

export const Default = {};
