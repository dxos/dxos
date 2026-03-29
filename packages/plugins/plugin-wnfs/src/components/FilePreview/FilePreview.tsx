//
// Copyright 2023 DXOS.org
//

import React from 'react';

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
          {...composableProps(props, { className: 'w-full h-full object-contain' })}
          src={url}
          ref={forwardedRef as React.ForwardedRef<HTMLImageElement>}
        />
      );
    } else if (type.startsWith('video/')) {
      return (
        <video
          {...composableProps(props, { className: 'w-full h-full object-contain' })}
          src={url}
          controls
          ref={forwardedRef as React.ForwardedRef<HTMLVideoElement>}
        />
      );
    } else {
      return (
        <iframe
          {...composableProps(props, { className: 'w-full h-full overflow-auto' })}
          src={url}
          ref={forwardedRef as React.ForwardedRef<HTMLIFrameElement>}
        />
      );
    }
  },
);
