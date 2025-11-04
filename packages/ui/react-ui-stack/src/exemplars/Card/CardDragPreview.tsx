//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { mx } from '@dxos/react-ui-theme';

import { cardRoot } from './fragments';

const CardDragPreviewRoot = ({ children }: PropsWithChildren<{}>) => <div className='p-2'>{children}</div>;

const CardDragPreviewContent = ({ children }: PropsWithChildren<{}>) => (
  <div className={mx(cardRoot, 'ring-focusLine ring-neutralFocusIndicator')}>{children}</div>
);

export const CardDragPreview = {
  Root: CardDragPreviewRoot,
  Content: CardDragPreviewContent,
};
