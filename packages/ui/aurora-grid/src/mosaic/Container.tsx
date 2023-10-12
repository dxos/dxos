//
// Copyright 2023 DXOS.org
//

import { type Modifier } from '@dnd-kit/core';
import React, {
  createContext,
  useEffect,
  type CSSProperties,
  type HTMLAttributes,
  type PropsWithChildren,
} from 'react';

import { type MosaicTileComponent } from './Tile';
import { useMosaic } from './hooks';
import { type MosaicDataItem, type MosaicDraggedItem, type MosaicMoveEvent } from './types';

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
  onOver?: (event: MosaicMoveEvent<TPosition>) => boolean;

  /**
   * Called when a tile is dropped on the container.
   */
  // TODO(burdon): Handle copy, delete, etc.
  onDrop?: (event: MosaicMoveEvent<TPosition>) => void;

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
