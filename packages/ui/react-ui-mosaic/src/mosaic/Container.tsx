//
// Copyright 2023 DXOS.org
//

import { type Modifier, type DragEndEvent, type DragMoveEvent } from '@dnd-kit/core';
import React, {
  createContext,
  useEffect,
  type CSSProperties,
  type HTMLAttributes,
  type PropsWithChildren,
  forwardRef,
} from 'react';

import { type ThemedClassName } from '@dxos/react-ui';

import { type MosaicDropAnimation } from './Root';
import { type MosaicTileComponent } from './Tile';
import { useMosaic } from './hooks';
import { type MosaicDataItem, type MosaicDraggedItem } from './types';

// TODO(wittjosiah): Factor out.
type WithRequiredProperty<Type, Key extends keyof Type> = Type & {
  [Property in Key]-?: Type[Property];
};

export const DEFAULT_TRANSITION = 200;
export const DEFAULT_TYPE = 'unknown';
export const DEFAULT_COMPONENT: MosaicTileComponent = forwardRef(() => <>missing component</>);

export type MosaicTileOverlayProps = {
  grow?: boolean;
  debug?: boolean;
  itemContext?: Record<string, unknown>;
};

/**
 * Possible operations when dropping a tile:
 * - `transfer` - Remove the tile from it's current path and move to a new path.
 * - `copy` - Add a clone of the tile at a new path.
 * - `rearrange` - Change the order of the tile within it's current path.
 * - `reject` - The tile is not allowed where it was dropped.
 */
// TODO(wittjosiah): Add 'delete'. Consider adding 'swap'.
export const MosaicOperations = ['transfer', 'copy', 'rearrange', 'reject'] as const;
export type MosaicOperation = (typeof MosaicOperations)[number];

export type DefaultMoveDetails = Pick<DragMoveEvent, 'delta'>;

export type MosaicMoveEvent<TPosition = unknown, TMoveDetails = DefaultMoveDetails> = {
  active: MosaicDraggedItem<TPosition>;
  over: MosaicDraggedItem<TPosition>;
  details?: TMoveDetails;
};

export type MosaicDropEvent<TPosition = unknown, TMoveDetails = DefaultMoveDetails> = MosaicMoveEvent<
  TPosition,
  TMoveDetails
> & {
  operation: MosaicOperation;
};

export type MosaicContainerProps<
  TData extends MosaicDataItem = MosaicDataItem,
  TPosition = unknown,
  TMoveDetails = DefaultMoveDetails,
  TTileElement extends HTMLElement = HTMLDivElement,
  TTileProps = {},
> = ThemedClassName<Omit<HTMLAttributes<TTileElement>, 'onDrop' | 'onSelect'>> &
  PropsWithChildren<{
    id: string;

    // TODO(wittjosiah): Don't expose externally.
    debug?: boolean;

    /**
     * Default component used to render tiles.
     */
    Component?: MosaicTileComponent<TData, TTileElement, TTileProps>;

    /**
     * Default type of tiles.
     */
    type?: string;

    /**
     * Length of transition when moving tiles in milliseconds.
     *
     * @default 200
     */
    transitionDuration?: number;

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
    onOver?: (event: MosaicMoveEvent<TPosition, TMoveDetails>) => MosaicOperation;

    /**
     * Called when a tile is dropped on the container.
     */
    onDrop?: (event: MosaicDropEvent<TPosition, TMoveDetails>) => MosaicDropAnimation;

    /**
     * Called when drag ends.
     */
    onDragEnd?: (event: DragEndEvent) => void;

    /**
     * Called on `dragmove` when over the container.
     */
    onMove?: (event: MosaicMoveEvent<TPosition, TMoveDetails>) => {
      operation: MosaicOperation;
      details?: TMoveDetails;
    };
  }>;

export type MosaicContainerContextType<
  TData extends MosaicDataItem = MosaicDataItem,
  TPosition = unknown,
  TMoveDetails = DefaultMoveDetails,
> = WithRequiredProperty<Omit<MosaicContainerProps<TData, TPosition, TMoveDetails>, 'children'>, 'type' | 'Component'>;

export const MosaicContainerContext = createContext<MosaicContainerContextType<any>>({
  id: 'never',
  type: DEFAULT_TYPE,
  Component: DEFAULT_COMPONENT,
});

/**
 * Root Container that manages the layout of tiles.
 */
export const MosaicContainer = ({
  children,
  id,
  debug,
  type = DEFAULT_TYPE,
  Component = DEFAULT_COMPONENT,
  transitionDuration = DEFAULT_TRANSITION,
  modifier,
  getOverlayProps,
  getOverlayStyle,
  onOver,
  onDrop,
  onMove,
  onDragEnd,
}: MosaicContainerProps) => {
  const mosaic = useMosaic();
  const container = {
    id,
    debug,
    type,
    Component,
    transitionDuration,
    modifier,
    getOverlayProps,
    getOverlayStyle,
    onOver,
    onDrop,
    onMove,
    onDragEnd,
  };

  useEffect(() => {
    mosaic.setContainer(container.id, container);
    return () => {
      // TODO(burdon): The overlay unregisters the container after the tile has re-rendered (removing it).
      // mosaic.setContainer(container.id);
    };
  }, Object.values(container));

  return <MosaicContainerContext.Provider value={container}>{children}</MosaicContainerContext.Provider>;
};
