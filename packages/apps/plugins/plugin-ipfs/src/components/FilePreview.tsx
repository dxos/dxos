//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { mx } from '@dxos/aurora-theme';

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
    return <iframe className={mx('max-w-full h-full overflow-auto', className)} src={url} />;
  }

  return <img className={mx('max-w-full h-full object-contain', className)} src={url} />;
};
