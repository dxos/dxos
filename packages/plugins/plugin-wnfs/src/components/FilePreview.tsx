//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type FilePreviewProps = ThemedClassName<{ type: string; url: string }>;

/**
 * File/content preview iframe.
 */
export const FilePreview = ({ type, url, classNames }: FilePreviewProps) => {
  if (type.startsWith('image/')) {
    return <img className={mx('is-full bs-full object-contain', classNames)} src={url} />;
  } else if (type.startsWith('video/')) {
    return <video className={mx('is-full bs-full object-contain', classNames)} src={url} controls />;
  } else {
    return <iframe className={mx('is-full bs-full overflow-auto', classNames)} src={url} />;
  }
};
