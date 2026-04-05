//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';

import { Obj, Ref } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { composable, composableProps } from '@dxos/ui-theme';

import { type Scene, Model } from '../../types';
import { SpacetimeCanvas, type SpacetimeCanvasProps } from '../SpacetimeCanvas';
import {
  type EditorActions,
  type SpacetimeTool,
  type ViewState,
  SpacetimeToolbar,
  type SpacetimeToolbarProps,
} from '../SpacetimeToolbar';

//
// Context
//

const SPACETIME_EDITOR = 'SpacetimeEditor';

type SpacetimeEditorContextValue = {
  scene?: Scene.Scene;
  tool: SpacetimeTool;
  onToolChange: (tool: SpacetimeTool) => void;
  viewState: ViewState;
  onViewChange: (next: Partial<ViewState>) => void;
  editorActions: EditorActions;
  /** Currently selected object id (set by canvas, read by actions). */
  selectedObjectId: string | null;
  setSelectedObjectId: (id: string | null) => void;
};

const [SpacetimeEditorProvider, useSpacetimeEditorContext] =
  createContext<SpacetimeEditorContextValue>(SPACETIME_EDITOR);

//
// Controller
//

interface SpacetimeController {
  setTool(tool: SpacetimeTool): void;
}

//
// Root
//

const SPACETIME_EDITOR_ROOT = 'SpacetimeEditor:Root';

type SpacetimeEditorRootProps = PropsWithChildren<{
  scene?: Scene.Scene;
}>;

const DEFAULT_VIEW_STATE: ViewState = { selectionMode: 'face', showGrid: true };

const SpacetimeEditorRoot = forwardRef<SpacetimeController, SpacetimeEditorRootProps>(
  ({ children, scene }, forwardedRef) => {
    const [tool, setTool] = useState<SpacetimeTool>('select');
    const [viewState, setViewState] = useState<ViewState>(DEFAULT_VIEW_STATE);
    const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

    const handleToolChange = useCallback((tool: SpacetimeTool) => setTool(tool), []);
    const handleViewChange = useCallback(
      (next: Partial<ViewState>) => setViewState((prev) => ({ ...prev, ...next })),
      [],
    );

    const handleAddCube = useCallback(() => {
      if (!scene) {
        return;
      }
      const cube = Model.make({ primitive: 'cube' });
      Obj.change(scene, (obj) => {
        obj.objects.push(Ref.make(cube));
      });
      Obj.setParent(cube, scene);
    }, [scene]);

    const handleDeleteSelected = useCallback(() => {
      if (!scene || !selectedObjectId) {
        return;
      }
      Obj.change(scene, (obj) => {
        const index = obj.objects.findIndex((ref) => (ref?.target as any)?.id === selectedObjectId);
        if (index !== -1) {
          obj.objects.splice(index, 1);
        }
      });
      setSelectedObjectId(null);
    }, [scene, selectedObjectId]);

    const editorActions: EditorActions = useMemo(
      () => ({ onAddObject: handleAddCube, onDeleteSelected: handleDeleteSelected }),
      [handleAddCube, handleDeleteSelected],
    );

    useImperativeHandle(forwardedRef, () => ({
      setTool: handleToolChange,
    }));

    return (
      <SpacetimeEditorProvider
        scene={scene}
        tool={tool}
        onToolChange={handleToolChange}
        viewState={viewState}
        onViewChange={handleViewChange}
        editorActions={editorActions}
        selectedObjectId={selectedObjectId}
        setSelectedObjectId={setSelectedObjectId}
      >
        {children}
      </SpacetimeEditorProvider>
    );
  },
);

SpacetimeEditorRoot.displayName = SPACETIME_EDITOR_ROOT;

//
// Toolbar
//

const SPACETIME_EDITOR_TOOLBAR = 'SpacetimeEditor:Toolbar';

type SpacetimeEditorToolbarProps = Pick<SpacetimeToolbarProps, 'alwaysActive'>;

const SpacetimeEditorToolbar = composable<HTMLDivElement, SpacetimeEditorToolbarProps>((props, forwardedRef) => {
  const { tool, onToolChange, viewState, onViewChange, editorActions } =
    useSpacetimeEditorContext(SPACETIME_EDITOR_TOOLBAR);

  return (
    <SpacetimeToolbar
      {...composableProps(props)}
      tool={tool}
      onToolChange={onToolChange}
      viewState={viewState}
      onViewChange={onViewChange}
      editorActions={editorActions}
      ref={forwardedRef}
    />
  );
});

SpacetimeEditorToolbar.displayName = SPACETIME_EDITOR_TOOLBAR;

//
// Canvas
//

const SPACETIME_EDITOR_CANVAS = 'SpacetimeEditor:Canvas';

type SpacetimeEditorCanvasProsp = Omit<SpacetimeCanvasProps, 'showAxes' | 'showFps'>;

const SpacetimeEditorCanvas = composable<HTMLDivElement, SpacetimeEditorCanvasProsp>((props, forwardedRef) => {
  const { scene, tool, viewState, setSelectedObjectId } = useSpacetimeEditorContext(SPACETIME_EDITOR_CANVAS);
  // Subscribe to ECHO scene changes so we re-render when objects are added/removed.
  const [liveScene] = useObject(scene);
  const objectCount = liveScene?.objects?.length ?? 0;
  return (
    <SpacetimeCanvas
      {...composableProps(props)}
      scene={scene}
      tool={tool}
      viewState={viewState}
      objectCount={objectCount}
      onSelectionChange={setSelectedObjectId}
      ref={forwardedRef}
    />
  );
});

SpacetimeEditorCanvas.displayName = SPACETIME_EDITOR_CANVAS;

//
// Composite export
//

export const SpacetimeEditor = {
  Root: SpacetimeEditorRoot,
  Toolbar: SpacetimeEditorToolbar,
  Canvas: SpacetimeEditorCanvas,
};

export type { SpacetimeController, SpacetimeEditorRootProps, SpacetimeEditorToolbarProps, SpacetimeEditorCanvasProsp };
