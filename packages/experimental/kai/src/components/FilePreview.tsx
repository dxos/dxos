//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

export type FilePreviewProps = {
  url: string;
  image?: boolean;
};

/**
 * File/content preview iframe.
 */
export const FilePreview: FC<FilePreviewProps> = ({ url, image = false }) => {
  if (!image) {
    return <iframe className='w-full h-full' src={url} />;
  }

  const styles = [
    'margin: 0',
    'height: 100vh',
    `background-image: url(${url})`,
    'background-repeat: no-repeat',
    'background-position: center center',
    'background-size: contain'
  ];

  const doc = `<html><body style="${styles.join(';')}" /></html>`;

  return <iframe className='w-full h-full' srcDoc={doc} />;
};
