//
// Copyright 2026 DXOS.org
//

import React, { ForwardedRef } from 'react';

import { composable, composableProps } from '@dxos/ui-theme';

export type FilePreviewProps = { type: string; url: string };

/**
 * File/content preview — image, PDF (iframe), or fallback download link.
 */
export const FilePreview = composable<HTMLElement, FilePreviewProps>(
  ({ type, url, children, ...props }, forwardedRef) => {
    if (type.startsWith('image/')) {
      return (
        <img
          {...composableProps(props, { classNames: 'h-full w-full object-contain' })}
          src={url}
          ref={forwardedRef as ForwardedRef<HTMLImageElement>}
        />
      );
    } else if (type === 'application/pdf') {
      return (
        <iframe
          {...composableProps(props, { classNames: 'h-full w-full overflow-auto' })}
          src={url}
          ref={forwardedRef as ForwardedRef<HTMLIFrameElement>}
        />
      );
    } else {
      return (
        <a
          {...composableProps(props, { classNames: 'p-4 underline' })}
          href={url}
          download
          ref={forwardedRef as ForwardedRef<HTMLAnchorElement>}
        >
          Download file
        </a>
      );
    }
  },
);
