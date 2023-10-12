//
// Copyright 2023 DXOS.org
//

import { Modifier } from '@dnd-kit/core';
import React, { createContext, useEffect, CSSProperties, HTMLAttributes, PropsWithChildren } from 'react';

import { MosaicTileComponent } from './Tile';
import { useMosaic } from './hooks';
import { MosaicDataItem, MosaicDraggedItem } from './types';

export type MosaicTileOverlayProps = {
  grow?: boolean;
  debug?: boolean;
};

// TODO(wittjosiah): Add delete.
export type MosaicOperation = 'adopt' | 'copy' | 'rearrange' | 'reject';

export type MosaicMoveEvent<TPosition = unknown> = {
  active: MosaicDraggedItem<TPosition>;
  over: MosaicDraggedItem<TPosition>;
};

export type MosaicDropEvent<TPosition = unknown> = MosaicMoveEvent<TPosition> & {
  operation: MosaicOperation;
};

export type MosaicCompareDataItem = Parameters<typeof Array.prototype.sort>[0];

export type MosaicContainerProps<
  TData extends MosaicDataItem = MosaicDataItem,
  TPosition = unknown,
  TCustom = any,
> = Pick<HTMLAttributes<HTMLDivElement>, 'className'> & {
  id: string;
  debug?: boolean;

  /**
   * Default component used to render tiles.
   */
  Component?: MosaicTileComponent<TData>;

  /**
   * Adapter to transform properties while dragging (e.g., constraint axes).
   * https://github.com/clauderic/dnd-kit/blob/master/packages/core/src/modifiers/types.ts
   */
  modifier?: (activeItem: MosaicDraggedItem, ...modifierArgs: Parameters<Modifier>) => ReturnType<Modifier>;

  /**
   * Property overrides for the default overlay.
   */
  getOverlayProps?: () => MosaicTileOverlayProps;

  /**
   * Style property overrides for the default overlay.
   */
  getOverlayStyle?: () => CSSProperties;

  /**
   * Called when a tile is dragged over the container.
   * Returns true if the tile can be dropped.
   */
  onOver?: (event: MosaicMoveEvent<TPosition>) => MosaicOperation;

  /**
   * Called when a tile is dropped on the container.
   */
  onDrop?: (event: MosaicDropEvent<TPosition>) => void;

  /**
   * Used to sort items within the container.
   */
  compare?: MosaicCompareDataItem;

  /**
   * Custom properties (available to event handlers).
   */
  // TODO(burdon): Still used?
  custom?: TCustom;
};

export type MosaicContainerContextType = MosaicContainerProps<any>;

export const MosaicContainerContext = createContext<MosaicContainerContextType | undefined>(undefined);

/**
 * Root Container that manages the layout of tiles.
 */
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
