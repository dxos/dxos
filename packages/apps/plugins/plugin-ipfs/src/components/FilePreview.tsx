//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

export type FilePreviewProps = {
  type: string;
  url: string;
};

/**
 * File/content preview iframe.
 */
export const FilePreview: FC<FilePreviewProps> = ({ type, url }) => {
  if (!type.startsWith('image')) {
    return <iframe className='w-full h-full overflow-auto' src={url} />;
  }

  // TODO(burdon): Use Radix AspectRatio?
  // https://www.radix-ui.com/primitives/docs/components/aspect-ratio
  const styles = [
    'margin: 0',
    'height: 100vh',
    `background-image: url(${url})`,
    'background-repeat: no-repeat',
    'background-position: center center',
    'background-size: contain',
  ];

  const doc = `<html><body style="${styles.join(';')}" /></html>`;
  return <iframe className='w-full h-full' srcDoc={doc} />;
};
