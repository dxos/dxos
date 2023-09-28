//
// Copyright 2023 DXOS.org
//

import { DragEndEvent, DragOverlay } from '@dnd-kit/core';
import React, { PropsWithChildren, useCallback } from 'react';

import { List, useId } from '@dxos/aurora';

import {
  MosaicContext,
  MosaicRootContext,
  MosaicRootContextValue,
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
  useMosaic,
} from './hooks';
import type { MosaicContextValue } from './hooks';
import { MosaicDndProvider, dropAnimations, useMosaicDnd } from '../dnd';
import { Tile } from '../tile';

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
      <MosaicDndProvider>
        <MosaicProviderImpl>{children}</MosaicProviderImpl>
      </MosaicDndProvider>
    </MosaicContext.Provider>
  );
};

const MosaicRoot = ({ children, ...value }: PropsWithChildren<MosaicRootContextValue>) => {
  const id = useId('mosaic', value.id);
  return <MosaicRootContext.Provider value={{ ...value, id }}>{children}</MosaicRootContext.Provider>;
};

export const Mosaic = {
  Provider: MosaicProvider,
  Root: MosaicRoot,
  Overlay: MosaicOverlay,
  Tile,
};
