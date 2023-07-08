//
// Copyright 2023 DXOS.org
//

import { Tldraw } from '@tldraw/tldraw';
import React, { FC } from 'react';

import { Drawing as DrawingType } from '@braneframe/types';
import { Main } from '@dxos/aurora';
import { SpaceProxy } from '@dxos/client';

import type { DrawingModel } from '../props';

export const DrawingMain: FC<{ data: [SpaceProxy, DrawingType] }> = ({ data }) => {
  const space = data[0];
  const drawing = data[data.length - 1] as DrawingType;

  const model: DrawingModel = {
    root: drawing,
  };

  // https://tldraw.dev/docs/assets
  // const assetUrls = getAssetUrls({
  //   baseUrl: 'https://unpkg.com/@tldraw/assets@2.0.0-alpha.12/',
  // });
  // console.log(assetUrls);
  // console.log(Tldraw, getAssetUrls, getAssetUrlsByMetaUrl);
  // const assetUrls = getAssetUrls();
  // const assetUrls = getAssetUrlsByMetaUrl();
  // console.log(assetUrls);

  return (
    <Main.Content classNames='flex flex-col grow min-bs-[100vh] overflow-hidden bg-white dark:bg-neutral-925'>
      <Tldraw assetBaseUrl='https://unpkg.com/@tldraw/assets@2.0.0-alpha.12/' />
    </Main.Content>
  );
};
