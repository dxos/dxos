//
// Copyright 2023 DXOS.org
//

import React, { ForwardedRef } from 'react';

import { composable, composableProps } from '@dxos/ui-theme';

export type FilePreviewProps = { type: string; url: string };

/**
 * File/content preview iframe.
 */
export const FilePreview = composable<HTMLElement, FilePreviewProps>(
  ({ type, url, children, ...props }, forwardedRef) => {
    if (type.startsWith('image/')) {
      return (
        <img
          {...composableProps(props, { className: 'h-full w-full object-contain' })}
          src={url}
          ref={forwardedRef as ForwardedRef<HTMLImageElement>}
        />
      );
    } else if (type.startsWith('video/')) {
      return (
        <video
          {...composableProps(props, { className: 'h-full w-full object-contain' })}
          src={url}
          controls
          ref={forwardedRef as ForwardedRef<HTMLVideoElement>}
        />
      );
    } else {
      return (
        <iframe
          {...composableProps(props, { className: 'h-full w-full overflow-auto' })}
          src={url}
          ref={forwardedRef as ForwardedRef<HTMLIFrameElement>}
        />
      );
    }
  },
);
