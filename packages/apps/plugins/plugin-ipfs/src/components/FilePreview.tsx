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
  if (!type.startsWith('image')) {
    return <iframe className={mx('w-full h-full overflow-auto', className)} src={url} />;
  }

  return <img className={mx('w-full h-full', className ?? 'object-contain')} src={url} />;
};
