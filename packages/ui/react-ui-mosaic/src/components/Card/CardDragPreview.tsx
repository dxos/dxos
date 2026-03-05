//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { mx } from '@dxos/ui-theme';

import { styles } from './styles';

const CardDragPreviewRoot = ({ children }: PropsWithChildren<{}>) => {
  return <div>{children}</div>;
};

const CardDragPreviewContent = ({ children }: PropsWithChildren<{}>) => {
  return <div className={mx(styles.root, 'ring-focus-line ring-neutral-focus-indicator')}>{children}</div>;
};

/**
 * @deprecated Mosaic now supports drag and drop natively.
 */
export const CardDragPreview = {
  Root: CardDragPreviewRoot,
  Content: CardDragPreviewContent,
};
