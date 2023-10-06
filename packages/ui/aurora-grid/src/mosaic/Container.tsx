//
// Copyright 2023 DXOS.org
//

import { Modifier } from '@dnd-kit/core';
import React, { createContext, useEffect, CSSProperties, HTMLAttributes, PropsWithChildren } from 'react';

import { MosaicTileComponent } from './Tile';
import { useMosaic } from './hooks';
import { MosaicDataItem, MosaicDraggedItem, MosaicMoveEvent } from './types';

export type MosaicTileOverlayProps = {
  grow?: boolean;
  debug?: boolean;
};

export type MosaicContainerProps<
  TData extends MosaicDataItem = MosaicDataItem,
  TPosition = unknown,
  TCustom = any,
> = Pick<HTMLAttributes<HTMLDivElement>, 'className'> & {
  id: string;
  debug?: boolean;

  // Default component used to render tiles.
  Component?: MosaicTileComponent<TData>;

  // https://github.com/clauderic/dnd-kit/blob/master/packages/core/src/modifiers/types.ts
  modifier?: (activeItem: MosaicDraggedItem, ...modifierArgs: Parameters<Modifier>) => ReturnType<Modifier>;

  // Overrides for the default overlay.
  getOverlayStyle?: () => CSSProperties;
  getOverlayProps?: () => MosaicTileOverlayProps;

  // TODO(burdon): Handle copy, delete, etc.
  onDrop?: (event: MosaicMoveEvent<TPosition>) => void;
  // TODO(wittjosiah): Generalize to onOver?
  isDroppable?: (event: MosaicMoveEvent<TPosition>) => boolean;

  // Custom properties.
  custom?: TCustom;
};

export type MosaicContainerContextType = MosaicContainerProps<any>;

export const MosaicContainerContext = createContext<MosaicContainerContextType | undefined>(undefined);

/**
 * Container for a collection of tiles.
 */
// TODO(burdon): Support passing in more context to event handlers; and for tiles to access.
export const MosaicContainer = ({ children, ...container }: PropsWithChildren<MosaicContainerProps>) => {
  const mosaic = useMosaic();
  useEffect(() => {
    mosaic.setContainer(container.id, container);
    return () => {
      // TODO(burdon): The overlay unregisters the container after the tile has re-rendered (removing it).
      // mosaic.setContainer(container.id);
    };
  }, []);

  return <MosaicContainerContext.Provider value={container}>{children}</MosaicContainerContext.Provider>;
};
