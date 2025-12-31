//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { mx } from '@dxos/ui-theme';

import { cardRoot } from './fragments';

const CardDragPreviewRoot = ({ children }: PropsWithChildren<{}>) => {
  return <div className='p-2'>{children}</div>;
};

const CardDragPreviewContent = ({ children }: PropsWithChildren<{}>) => {
  return <div className={mx(cardRoot, 'ring-focusLine ring-neutralFocusIndicator')}>{children}</div>;
};

export const CardDragPreview = {
  Root: CardDragPreviewRoot,
  Content: CardDragPreviewContent,
};
