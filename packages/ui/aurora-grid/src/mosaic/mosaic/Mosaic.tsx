//
// Copyright 2023 DXOS.org
//

import { DragEndEvent, DragOverlay } from '@dnd-kit/core';
import React, { createContext, PropsWithChildren, useCallback, useContext } from 'react';

import { List, useId } from '@dxos/aurora';

import {
  useDragEnd,
  useDragOver,
  useDragStart,
  useHandleCopyDragEnd,
  useHandleCopyDragOver,
  useHandleCopyDragStart,
  useHandleMigrateDragEnd,
  useHandleMigrateDragOver,
  useHandleMigrateDragStart,
  useHandleRearrangeDragEnd,
} from './hooks';
import { DndProvider, dropAnimations, useDnd as useMosaicDnd } from '../dnd';
import { Tile, Stack, Card, TreeItem } from '../tile';
import type { MosaicRootContextValue, MosaicContextValue } from '../types';
import { MosaicRootProps } from '../types';

const MosaicOverlayTile = ({ id }: { id: string }) => {
  const {
    mosaic: {
      tiles: { [id]: activeTile },
    },
    getData,
    Delegator,
  } = useMosaic();
  return (
    <List role='none'>
      <Delegator data={getData(id)} tile={activeTile} isOverlay />
    </List>
  );
};

const MosaicOverlay = () => {
  const { activeId, overlayDropAnimation } = useMosaicDnd();
  return (
    <DragOverlay adjustScale={false} dropAnimation={dropAnimations[overlayDropAnimation]}>
      {activeId ? <MosaicOverlayTile id={activeId} /> : null}
    </DragOverlay>
  );
};

const defaultMosaicContextValue: MosaicContextValue = {
  getData: () => ({}),
  mosaic: { tiles: {}, relations: {} },
  onMosaicChange: () => {},
  copyTile: () => ({
    id: 'never',
    index: 'a0',
    variant: 'card',
  }),
  Delegator: () => null,
};

const MosaicContext = createContext<MosaicContextValue>(defaultMosaicContextValue);

const MosaicProviderImpl = ({ children }: PropsWithChildren<{}>) => {
  // Drag start: do both.
  const handleMigrateDragStart = useHandleMigrateDragStart();
  useDragStart(handleMigrateDragStart, [handleMigrateDragStart]);
  const handleCopyDragStart = useHandleCopyDragStart();
  useDragStart(handleCopyDragStart, [handleCopyDragStart]);

  // Drag end: do one.
  const handleRearrangeDragEnd = useHandleRearrangeDragEnd();
  const handleMigrateDragEnd = useHandleMigrateDragEnd();
  const handleCopyDragEnd = useHandleCopyDragEnd();
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      handleMigrateDragEnd(event, handleCopyDragEnd(event, handleRearrangeDragEnd(event)));
    },
    [handleRearrangeDragEnd, handleCopyDragEnd, handleMigrateDragEnd],
  );
  useDragEnd(handleDragEnd, [handleDragEnd]);

  // Drag over: do both.
  const handleMigrateDragOver = useHandleMigrateDragOver();
  useDragOver(handleMigrateDragOver, [handleMigrateDragOver]);
  const handleCopyDragOver = useHandleCopyDragOver();
  useDragOver(handleCopyDragOver, [handleCopyDragOver]);

  return <>{children}</>;
};

const MosaicProvider = ({ children, ...contextValue }: PropsWithChildren<MosaicContextValue>) => {
  return (
    <MosaicContext.Provider value={contextValue}>
      <DndProvider>
        <MosaicProviderImpl>{children}</MosaicProviderImpl>
      </DndProvider>
    </MosaicContext.Provider>
  );
};

const defaultMosaicRootContextValue: MosaicRootContextValue = {
  id: 'never',
};

const MosaicRootContext = createContext<MosaicRootContextValue>(defaultMosaicRootContextValue);

const useMosaic = () => useContext(MosaicContext);
const useMosaicRoot = () => useContext(MosaicRootContext);

const MosaicRoot = ({ children, ...value }: PropsWithChildren<MosaicRootProps>) => {
  const id = useId('mosaic', value.id);
  return <MosaicRootContext.Provider value={{ ...value, id }}>{children}</MosaicRootContext.Provider>;
};

export const Mosaic = {
  Provider: MosaicProvider,
  Root: MosaicRoot,
  Overlay: MosaicOverlay,
  Tile,
  Stack,
  Card,
  TreeItem,
};

export { useMosaic, useMosaicRoot, useMosaicDnd };
