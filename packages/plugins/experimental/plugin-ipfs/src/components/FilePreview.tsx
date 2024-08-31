//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { mx } from '@dxos/react-ui-theme';

export type FilePreviewProps = {
  type: string;
  url: string;
  className?: string;
};

/**
 * File/content preview iframe.
 */
export const FilePreview: FC<FilePreviewProps> = ({ type, url, className }) => {
  if (type.startsWith('image/')) {
    return <img className={mx('h-full w-full object-contain', className)} src={url} />;
  } else if (type.startsWith('video/')) {
    return <video className={mx('h-full w-full object-contain', className)} src={url} controls />;
  } else {
    return <iframe className={mx('h-full w-full overflow-auto', className)} src={url} />;
  }
};
