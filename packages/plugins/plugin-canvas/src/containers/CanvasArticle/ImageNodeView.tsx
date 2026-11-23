//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { type NodeViewProps } from '@dxos/react-ui-canvas';
import * as Icon from '@dxos/react-ui/Icon';

import { imageUrl, isImageNode } from '#model';

/** An image shape: the linked picture fitted to the frame, or a placeholder until it has a URL that loads. */
export const ImageNodeView = ({ node }: NodeViewProps) => {
  const src = isImageNode(node) ? imageUrl(node.src) : undefined;
  const [failed, setFailed] = useState<string>();
  if (!src || failed === src) {
    return (
      <div
        className='dx-cover flex flex-col items-center justify-center gap-1 border border-dashed border-separator rounded-sm text-fg-muted pointer-events-none'
        data-testid='image-placeholder'
      >
        <Icon.Icon icon='ph--image--regular' size='lg' />
        {src && <span className='text-xs'>Could not load the image</span>}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={isImageNode(node) ? (node.alt ?? '') : ''}
      className='dx-cover w-full h-full pointer-events-none select-none'
      style={{ objectFit: isImageNode(node) ? (node.fit ?? 'contain') : 'contain' }}
      draggable={false}
      referrerPolicy='no-referrer'
      onError={() => setFailed(src)}
      data-testid='image-node'
    />
  );
};
