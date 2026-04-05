//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useState, useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';

import { Obj, Ref } from '@dxos/echo';
import { exportSTL, downloadFile } from '../../engine';
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
  selectedPrimitive: Model.PrimitiveType;
  onPrimitiveChange: (primitive: Model.PrimitiveType) => void;
  editorActions: EditorActions;
  selectedObjectId: string | null;
  setSelectedObjectId: (id: string | null) => void;
  /** Runtime Manifold solids (provided by canvas). */
  solidsRef: React.RefObject<Map<string, import('manifold-3d').Manifold> | null>;
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
    const [selectedPrimitive, setSelectedPrimitive] = useState<Model.PrimitiveType>('cube');
    const solidsRef = useRef<Map<string, import('manifold-3d').Manifold> | null>(null);

    const handleToolChange = useCallback((tool: SpacetimeTool) => setTool(tool), []);
    const handleViewChange = useCallback(
      (next: Partial<ViewState>) => setViewState((prev) => ({ ...prev, ...next })),
      [],
    );
    const handlePrimitiveChange = useCallback((primitive: Model.PrimitiveType) => setSelectedPrimitive(primitive), []);

    const handleAddObject = useCallback(() => {
      if (!scene) {
        return;
      }
      const object = Model.make({ primitive: selectedPrimitive });
      Obj.change(scene, (obj) => {
        obj.objects.push(Ref.make(object));
      });
      Obj.setParent(object, scene);
    }, [scene, selectedPrimitive]);

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

    const handleExportSTL = useCallback(() => {
      if (!selectedObjectId || !solidsRef.current) {
        return;
      }
      const solid = solidsRef.current.get(selectedObjectId);
      if (solid) {
        const buffer = exportSTL(solid);
        downloadFile(buffer, 'object.stl');
      }
    }, [selectedObjectId]);

    const editorActions: EditorActions = useMemo(
      () => ({ onAddObject: handleAddObject, onDeleteSelected: handleDeleteSelected, onExportSTL: handleExportSTL }),
      [handleAddObject, handleDeleteSelected, handleExportSTL],
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
        selectedPrimitive={selectedPrimitive}
        onPrimitiveChange={handlePrimitiveChange}
        editorActions={editorActions}
        selectedObjectId={selectedObjectId}
        setSelectedObjectId={setSelectedObjectId}
        solidsRef={solidsRef}
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
  const { tool, onToolChange, viewState, onViewChange, selectedPrimitive, onPrimitiveChange, editorActions } =
    useSpacetimeEditorContext(SPACETIME_EDITOR_TOOLBAR);

  return (
    <SpacetimeToolbar
      {...composableProps(props)}
      tool={tool}
      onToolChange={onToolChange}
      viewState={viewState}
      onViewChange={onViewChange}
      selectedPrimitive={selectedPrimitive}
      onPrimitiveChange={onPrimitiveChange}
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
  const { scene, tool, viewState, setSelectedObjectId, solidsRef: parentSolidsRef } =
    useSpacetimeEditorContext(SPACETIME_EDITOR_CANVAS);
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
      parentSolidsRef={parentSolidsRef}
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
