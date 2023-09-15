//
// Copyright 2023 DXOS.org
//

import { DragEndEvent, DragOverlay } from '@dnd-kit/core';
import React, { createContext, PropsWithChildren, useCallback, useContext } from 'react';

import { List, useId } from '@dxos/aurora';

import {
  DndProvider,
  useDnd as useMosaicDnd,
  useDragEnd,
  useDragOver,
  useDragStart,
  useHandleRearrangeDragEnd,
} from '../dnd';
import {
  useHandleMigrateDragEnd,
  useHandleMigrateDragOver,
  useHandleMigrateDragStart,
} from '../dnd/hooks/useHandleMigrate';
import { Tile, Stack, Card, TreeItem } from '../tile';
import type { MosaicRootContextValue, MosaicContextValue } from '../types';
import { MosaicRootProps } from '../types';

const MosaicOverlayTile = ({ id }: { id: string }) => {
  const {
    mosaic: {
      tiles: { [id]: activeTile },
    },
    Delegator,
  } = useMosaic();
  const { [id]: data } = useMosaicData();
  const Root = activeTile.variant === 'treeitem' ? List : 'div';
  return (
    <Root role='none'>
      <Delegator data={data} tile={activeTile} isOverlay />
    </Root>
  );
};

const MosaicOverlay = () => {
  const { activeId } = useMosaicDnd();
  return <DragOverlay>{activeId ? <MosaicOverlayTile id={activeId} /> : null}</DragOverlay>;
};

const defaultMosaicContextValue: MosaicContextValue = {
  data: {},
};

const MosaicContext = createContext<MosaicContextValue>(defaultMosaicContextValue);

const useMosaicData = () => useContext(MosaicContext).data;

const MosaicProvider = ({ children, ...contextValue }: PropsWithChildren<MosaicContextValue>) => {
  return (
    <MosaicContext.Provider value={contextValue}>
      <DndProvider>{children}</DndProvider>
    </MosaicContext.Provider>
  );
};

const defaultMosaicRootContextValue: MosaicRootContextValue = {
  mosaic: { tiles: {}, relations: {} },
  Delegator: () => null,
  onMosaicChange: () => {},
  id: 'never',
};

const MosaicRootContext = createContext<MosaicRootContextValue>(defaultMosaicRootContextValue);

const useMosaic = () => useContext(MosaicRootContext);

const MosaicRootImpl = ({ children }: PropsWithChildren) => {
  const handleDragStart = useHandleMigrateDragStart();
  const handleRearrangeDragEnd = useHandleRearrangeDragEnd();
  const handleMigrateDragEnd = useHandleMigrateDragEnd();
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      handleMigrateDragEnd(event, handleRearrangeDragEnd(event));
    },
    [handleRearrangeDragEnd, handleMigrateDragEnd],
  );
  const handleDragOver = useHandleMigrateDragOver();
  useDragStart(handleDragStart, [handleDragStart]);
  useDragEnd(handleDragEnd, [handleDragEnd]);
  useDragOver(handleDragOver, [handleDragOver]);
  return (
    <>
      {children}
      <MosaicOverlay />
    </>
  );
};

const MosaicRoot = ({ children, ...value }: PropsWithChildren<MosaicRootProps>) => {
  const id = useId('mosaic', value.id);
  return (
    <MosaicRootContext.Provider value={{ ...value, id }}>
      <MosaicRootImpl>{children}</MosaicRootImpl>
    </MosaicRootContext.Provider>
  );
};

export const Mosaic = {
  Provider: MosaicProvider,
  Root: MosaicRoot,
  Tile,
  Stack,
  Card,
  TreeItem,
};

export { useMosaic, useMosaicData, useMosaicDnd };
