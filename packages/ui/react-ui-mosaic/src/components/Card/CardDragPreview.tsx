//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { mx } from '@dxos/ui-theme';

import { cardRoot } from './styles';

// TODO(burdon): Why p-2?
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
