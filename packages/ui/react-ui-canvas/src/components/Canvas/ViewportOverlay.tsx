//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { useMemo } from 'react';

import * as Menu from '@dxos/react-ui/Menu';
import * as VirtualAnchor from '@dxos/react-ui/VirtualAnchor';

import { type Camera, type SceneLook, isInstanceNode } from '../../model/index.ts';
import { isAnonymous } from '../../utils/index.ts';
import { GrainOverlay } from '../Background/index.ts';
import {
  useCanvasEditing,
  useCanvasGesture,
  useCanvasNavigation,
  useCanvasSelection,
  useCanvasServices,
} from './CanvasContext.ts';

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
      <span
        ref={menuAnchorRef}
        className='absolute size-0 pointer-events-none'
        style={{ left: menu?.at.x ?? 0, top: menu?.at.y ?? 0 }}
      />
      <Menu.Root
        open={menu !== undefined}
        onOpenChange={({ open }) => !open && closeMenu()}
        positioning={{
          ...VirtualAnchor.virtualAnchor(menuAnchorRef),
          placement: 'right',
          gutter: 4,
          overflowPadding: 8,
        }}
      >
        <Menu.Content>
          {/* Undo and redo lead every menu but a control point's, as they lead the app's own context menu. */}
          {(menu?.kind === 'element' || menu?.kind === 'canvas') && (
            <>
              <Menu.Item
                data-testid='menu-undo'
                disabled={readonly || !history.canUndo}
                onSelect={document.undo}
                item={{ value: 'Undo', label: 'Undo' }}
              />
              <Menu.Item
                data-testid='menu-redo'
                disabled={readonly || !history.canRedo}
                onSelect={document.redo}
                item={{ value: 'Redo', label: 'Redo' }}
              />
              <Menu.Separator />
            </>
          )}
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
          {menu?.kind === 'element' && (
            <>
              <Menu.Item
                data-testid='menu-cut'
                disabled={!capabilities.delete}
                onSelect={cut}
                item={{ value: 'Cut', label: 'Cut' }}
              />
              <Menu.Item data-testid='menu-copy' onSelect={copy} item={{ value: 'Copy', label: 'Copy' }} />
              <Menu.Item
                data-testid='menu-delete'
                disabled={!capabilities.delete}
                onSelect={selectionAspect.commands.delete}
                item={{ value: 'Delete', label: 'Delete' }}
              />
              <Menu.Separator />
              <Menu.Item
                data-testid='menu-group'
                disabled={!capabilities.create || !capabilities.delete}
                onSelect={selectionAspect.commands.group}
                item={{ value: 'Group', label: 'Group' }}
              />
              {selectedInstance && (
                <>
                  <Menu.Item
                    data-testid='menu-edit-object'
                    onSelect={() => drillIn(selectedInstance)}
                    item={{ value: 'Edit object', label: 'Edit object' }}
                  />
                  <Menu.Item
                    data-testid='menu-ungroup'
                    disabled={!capabilities.create || !capabilities.delete}
                    onSelect={selectionAspect.commands.ungroup}
                    item={{ value: 'Ungroup', label: 'Ungroup' }}
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
            </>
          )}
          {menu?.kind === 'canvas' && canGoBack && (
            <Menu.Item data-testid='menu-back' onSelect={back} item={{ value: 'Back', label: 'Back' }} />
          )}
          {menu?.kind === 'canvas' && (
            <Menu.Item
              data-testid='menu-paste'
              disabled={!clipboard || !capabilities.create}
              onSelect={() => paste(menu.scene)}
              item={{ value: 'Paste', label: 'Paste' }}
            />
          )}
        </Menu.Content>
      </Menu.Root>
    </>
  );
};
