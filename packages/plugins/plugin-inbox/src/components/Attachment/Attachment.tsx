//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type AttachmentKind } from '#hooks';

export type AttachmentViewerProps = ThemedClassName<{
  /** Object url for the attachment's bytes; absent while resolving or after a failure. */
  url?: string;
  /** How to render the bytes, derived from the MIME type by `getAttachmentKind`. */
  kind: AttachmentKind;
  /** MIME type, shown in the unsupported state so the reason is legible. */
  type?: string;
  name?: string;
  pending?: boolean;
}>;

/**
 * Renders an attachment's bytes according to its kind. Presentation only — resolving the blob to a url
 * is the container's job (`useBlobUrl`), so this stays testable without ECHO.
 *
 * PDFs render in a sandboxed `<iframe>`: the browser's own viewer is far better than anything worth
 * building here, and the sandbox keeps a hostile document from scripting the app around it.
 */
export const AttachmentViewer = ({ url, kind, type, name, pending, classNames }: AttachmentViewerProps) => {
  if (pending) {
    return (
      <div className={mx('grid place-items-center p-8 text-description', classNames)} role='status'>
        <Icon icon='ph--spinner-gap--regular' size={6} classNames='[animation:spin_1s_linear_infinite]' />
      </div>
    );
  }

  if (!url) {
    return (
      <div className={mx('grid place-items-center gap-2 p-8 text-description', classNames)}>
        <Icon icon='ph--warning--regular' size={6} />
        <span data-testid='attachment.unavailable'>Attachment could not be loaded.</span>
      </div>
    );
  }

  switch (kind) {
    case 'pdf': {
      return (
        <iframe
          src={url}
          title={name ?? 'Attachment'}
          className={mx('dx-fill min-h-96 border-0', classNames)}
          // No `allow-scripts`: a PDF never needs it, and withholding it means a malicious document
          // cannot reach the embedding app.
          sandbox=''
          data-testid='attachment.pdf'
        />
      );
    }

    case 'image': {
      return (
        <img
          src={url}
          alt={name ?? 'Attachment'}
          className={mx('max-w-full object-contain', classNames)}
          data-testid='attachment.image'
        />
      );
    }

    case 'text': {
      return (
        <iframe
          src={url}
          title={name ?? 'Attachment'}
          className={mx('dx-fill min-h-96 border-0 bg-baseSurface', classNames)}
          sandbox=''
          data-testid='attachment.text'
        />
      );
    }

    case 'unsupported':
    default: {
      // Deliberately a download rather than a render: putting unknown bytes in an iframe is how a mail
      // client turns an attachment into an execution surface.
      return (
        <div className={mx('grid place-items-center gap-2 p-8 text-description', classNames)}>
          <Icon icon='ph--file--regular' size={6} />
          <span data-testid='attachment.unsupported'>{type ? `No preview for ${type}` : 'No preview available'}</span>
          <a href={url} download={name} className='dx-link-hover underline' data-testid='attachment.download'>
            Download{name ? ` ${name}` : ''}
          </a>
        </div>
      );
    }
  }
};

AttachmentViewer.displayName = 'AttachmentViewer';
