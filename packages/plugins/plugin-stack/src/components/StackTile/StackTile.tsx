//
// Copyright 2024 DXOS.org
//

import React, { type ReactNode } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { Mosaic, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { mx } from '@dxos/ui-theme';

export type StackTileProps = ThemedClassName<MosaicTileProps<any>> & {
  /** Left-rail content (e.g. the section menu/actions). */
  rail?: ReactNode;
};

/**
 * A stack item rendered as a Mosaic tile: a vertical left-rail (menu/actions) beside a main
 * content area (`children`, typically a Surface).
 */
export const StackTile = ({ rail, children, classNames, ...tileProps }: StackTileProps) => (
  <Mosaic.Tile {...tileProps} classNames={mx('grid grid-cols-[min-content_1fr] dx-attention-surface', classNames)}>
    <div className='flex flex-col p-1 border-e border-subdued-separator'>{rail}</div>
    {children}
  </Mosaic.Tile>
);
