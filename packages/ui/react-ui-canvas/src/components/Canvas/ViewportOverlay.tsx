//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useMemo } from 'react';

import * as Menu from '@dxos/react-ui/Menu';
import { MAJOR_GRID } from '@dxos/scene';

import { type Camera, type SceneLook, isInstanceNode } from '../../model/index.ts';
import { isAnonymous, sceneMenuItems } from '../../utils/index.ts';
import { GrainOverlay } from '../Background/index.ts';
import { SceneContextMenu } from '../SceneContextMenu/index.ts';
import {
  useCanvasDocument,
  useCanvasEditing,
  useCanvasGesture,
  useCanvasNavigation,
  useCanvasSelection,
  useCanvasServices,
} from './CanvasContext.ts';

/** How far a duplicate lands from what it copies, as Cmd+D does: one major grid step. */
const DUPLICATE_STEP = { x: MAJOR_GRID, y: MAJOR_GRID };

export type ViewportOverlayProps = {
  camera: Camera;
  look: SceneLook;
};

/** Over the scene: the grain, the shield that takes the pointer while the camera moves, and the menu a gesture opens. */
export const ViewportOverlay = ({ camera, look }: ViewportOverlayProps) => {
  const { registry, atoms, store, capabilities, objectActions, transparent, readonly, document } =
    useCanvasServices('Canvas.Viewport');
  const { displayScene, navigating, removePoint, menu, closeMenu, menuAnchorRef } = useCanvasGesture('Canvas.Viewport');
  const selectionAspect = useCanvasSelection('Canvas.Viewport');
  const editingAspect = useCanvasEditing('Canvas.Viewport');
  const { drillIn, back } = useCanvasNavigation('Canvas.Viewport').commands;
  // Back is offered only where there is a level above: inside a frame's scene, or an instance opened in isolation.
  const path = useAtomValue(atoms.path);
  const isolation = useAtomValue(atoms.isolation);
  const canGoBack = path.length > 1 || isolation !== undefined;
  const selection = useAtomValue(selectionAspect.atoms.selection);
  const clipboard = useAtomValue(editingAspect.atoms.clipboard);
  const history = useAtomValue(document.history);
  const { copy, cut, paste } = editingAspect.commands;
  const { intents } = useCanvasDocument('Canvas.Viewport');
  const views = useAtomValue(store.views);
  // The one instance selected, which the element menu offers to edit, ungroup or make unique.
  const selectedInstance = useMemo(() => {
    const [only] = selection.size === 1 ? [...selection] : [];
    const node = only === undefined ? undefined : displayScene.nodes[only];
    return node && isInstanceNode(node) ? node : undefined;
  }, [selection, displayScene]);

  return (
    <>
      {/* Transparent draws no surface, so no grain over it either. */}
      {!transparent && (
        <GrainOverlay background={look.background} offset={{ x: camera.x * camera.zoom, y: camera.y * camera.zoom }} />
      )}
      {/* Wheel events still bubble to the root through the shield, so a zoom keeps zooming. */}
      {navigating && <div className='dx-cover' data-testid='navigation-shield' />}
      {/* The anchor the gesture machine parks the menu at, which positions it. */}
      <span ref={menuAnchorRef} className='hidden' />
      <SceneContextMenu
        at={menu?.at}
        items={
          menu?.kind === 'point' || menu === undefined
            ? []
            : sceneMenuItems({
                kind: menu.kind,
                readonly,
                canUndo: history.canUndo,
                canRedo: history.canRedo,
                canPaste: clipboard !== undefined,
                canCreate: capabilities.create === true,
                canDelete: capabilities.delete === true,
                canGroup: capabilities.create === true && capabilities.delete === true && selection.size > 0,
                canUngroup:
                  selectedInstance !== undefined && capabilities.create === true && capabilities.delete === true,
                // A 2D object is made by grouping, which Group already offers.
                canMakeObject: false,
              }).filter((item) => item.id !== 'make-object')
        }
        onCommand={(command) => {
          switch (command) {
            case 'undo':
              return document.undo();
            case 'redo':
              return document.redo();
            case 'cut':
              return cut();
            case 'copy':
              return copy();
            case 'paste':
              return paste(menu?.scene);
            case 'duplicate':
              return void intents.duplicate(selection, DUPLICATE_STEP);
            case 'delete':
              return void selectionAspect.commands.delete();
            case 'group':
              return void selectionAspect.commands.group();
            case 'ungroup':
              return void selectionAspect.commands.ungroup();
          }
        }}
        onClose={closeMenu}
        extra={
          <>
            {menu?.kind === 'point' && (
              <Menu.Item
                data-testid='remove-point'
                onSelect={() => {
                  const point = registry.get(atoms.point);
                  if (point) {
                    removePoint(point);
                  }
                }}
                item={{ value: 'Remove control point', label: 'Remove control point' }}
              />
            )}
            {menu?.kind === 'element' && selectedInstance && (
              <>
                <Menu.Separator />
                <Menu.Item
                  data-testid='menu-edit-object'
                  onSelect={() => drillIn(selectedInstance)}
                  item={{ value: 'Edit object', label: 'Edit object' }}
                />
                <Menu.Item
                  data-testid='menu-make-unique'
                  // An anonymous Object has the one Instance, so it is already unique.
                  disabled={!capabilities.update || isAnonymous(views[selectedInstance.composite])}
                  onSelect={() => objectActions.makeUnique(selectedInstance.id)}
                  item={{ value: 'Make unique', label: 'Make unique' }}
                />
              </>
            )}
            {menu?.kind === 'canvas' && canGoBack && (
              <Menu.Item data-testid='menu-back' onSelect={back} item={{ value: 'Back', label: 'Back' }} />
            )}
          </>
        }
      />
    </>
  );
};
