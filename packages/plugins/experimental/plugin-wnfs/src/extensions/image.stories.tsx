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
import { filePath, store } from '../common';
import { loadWnfs } from '../load';
import { upload } from '../upload';

const Story = () => {
  const space = useSpace();

  const [blockstore, setBlockstore] = useState<Blockstore>();
  const [amountOfUploads, setAmountOfUploads] = useState<number>(0);
  const [images, setImages] = useState<{ url: string }[]>([]);

  useEffect(() => {
    if (space) {
      console.log('SPACE ID', space.properties.id);
    }

    const create = async () => {
      // NOTE: We don't pass in the URL of the Blob service, so we don't use it.
      const bs = createBlockstore();
      await bs.open();
      setBlockstore(bs);
    };

    create().catch(console.error);
  }, [space]);

  useEffect(() => {
    if (!space || !blockstore) {
      return;
    }

    (async () => {
      const { directory, forest } = await loadWnfs(space, blockstore);
      const parentPath = ['spaces', space.properties.id, 'files'];
      const parentNode = await directory.getNode(parentPath, true, forest, store(blockstore));
      if (!parentNode) {
        return;
      }

      const { result } = await directory.ls(parentPath, true, forest, store(blockstore));

      const images = await Promise.all(
        result.map(async (r: any) => {
          const path = filePath(r.name, space);
          const reading = await directory.read(path, true, forest, store(blockstore));
          const bytes = reading.result;
          const blob = new Blob([bytes]);
          const url = URL.createObjectURL(blob);
          return { url };
        }),
      );

      setImages(images);
    })().catch(console.error);
  }, [space, blockstore, amountOfUploads]);

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (blockstore) {
        if (space) {
          await upload({ blockstore, file, space });
          setAmountOfUploads(amountOfUploads + 1);
        } else {
          console.warn('Space is undefined.');
        }
      } else {
        console.warn("Blockstore hasn't been initialised yet.");
      }
    }
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

  const renderedImages = images.map((image, index) => (
    <div key={index} className='mt-1'>
      <img src={image.url} width='300' />
    </div>
  ));

  return (
    <>
      <div className='mb-2'>
        <input type='file' accept='image/*' onChange={onFileChange} />
      </div>
      <div className='w-[50rem]' ref={parentRef} {...focusAttributes} />
      <div>
        {images.length ? (
          renderedImages
        ) : (
          <p>
            <strong className='text-green-600'>Select an image file to add to WNFS and render it.</strong>
          </p>
        )}
      </div>
    </>
  );
};

export default {
  title: 'plugins/plugin-wnfs/image',
  render: Story,
  decorators: [withClientProvider({ createIdentity: true, createSpace: true }), withTheme, withLayout()],
};

export const Default = {};
