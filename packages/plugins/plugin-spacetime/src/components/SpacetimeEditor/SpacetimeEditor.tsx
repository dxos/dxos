//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, {
  type PropsWithChildren,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
  RefObject,
} from 'react';

import { Obj, Ref } from '@dxos/echo';
import { exportSTL, downloadFile } from '../../engine';
import { useObject } from '@dxos/echo-react';
import { composable, composableProps } from '@dxos/ui-theme';

import { type Scene, Model } from '../../types';
import { SpacetimeCanvas, type SpacetimeCanvasProps } from '../SpacetimeCanvas';
import {
  type EditorActions,
  type SelectionState,
  type SpacetimeTool,
  type ViewState,
  SpacetimeToolbar,
  type SpacetimeToolbarProps,
} from '../SpacetimeToolbar';
import { type ToolState } from '../SpacetimeToolbar/tools';

//
// Context
//

const SPACETIME_EDITOR = 'SpacetimeEditor';

type SpacetimeEditorContextValue = {
  scene?: Scene.Scene;

  /** Actions. */
  editorActions: EditorActions;

  /** Tools. */
  toolState: ToolState;
  onToolChange: (next: Partial<ToolState>) => void;

  /** View. */
  viewState: ViewState;
  onViewChange: (next: Partial<ViewState>) => void;

  /** Object Properties. */
  selectedHue: string;
  onHueChange: (hue: string) => void;

  /** Selection. */
  selectionState: SelectionState;
  onSelectionChange: (next: Partial<SelectionState>) => void;

  selectedObjectId: string | null;
  setSelectedObjectId: (id: string | null) => void;

  selectedPrimitive: Model.PrimitiveType;
  onSelectedPrimitiveChange: (primitive: Model.PrimitiveType) => void;

  /** Runtime Manifold solids (provided by canvas). */
  solidsRef: RefObject<Map<string, import('manifold-3d').Manifold> | null>;

  /** Ref for canvas to provide the import implementation (ArrayBuffer for GLB, string for OBJ). */
  importGLBRef: RefObject<(data: ArrayBuffer | string) => Promise<void>>;

  /** Ref for canvas to provide object deletion (disposes mesh + solid). */
  deleteObjectRef: RefObject<(objectId: string) => void>;
};

const [SpacetimeEditorProvider, useSpacetimeEditorContext] =
  createContext<SpacetimeEditorContextValue>(SPACETIME_EDITOR);

//
// Controller
//

interface SpacetimeController {
  setTool(tool: Partial<ToolState>): void;
}

//
// Root
//

const SPACETIME_EDITOR_ROOT = 'SpacetimeEditor:Root';

type SpacetimeEditorRootProps = PropsWithChildren<{
  scene?: Scene.Scene;
}>;

const DEFAULT_SELECTION_STATE: SelectionState = { selectionMode: 'face' };
const DEFAULT_VIEW_STATE: ViewState = { showGrid: true, showDebug: false };

const SpacetimeEditorRoot = forwardRef<SpacetimeController, SpacetimeEditorRootProps>(
  ({ children, scene }, forwardedRef) => {
    const [toolState, setToolState] = useState<ToolState>({ tool: 'select' });
    const [selectionState, setSelectionState] = useState<SelectionState>(DEFAULT_SELECTION_STATE);
    const [viewState, setViewState] = useState<ViewState>(DEFAULT_VIEW_STATE);
    const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
    const [selectedPrimitive, setSelectedPrimitive] = useState<Model.PrimitiveType>('cube');
    const [selectedHue, setSelectedHue] = useState<string>('blue');
    const solidsRef = useRef<Map<string, import('manifold-3d').Manifold> | null>(null);
    const importGLBRef = useRef<(data: ArrayBuffer | string) => Promise<void>>(async () => {});
    const deleteObjectRef = useRef<(objectId: string) => void>(() => {});

    const handleToolChange = useCallback(
      (next: Partial<ToolState>) => setToolState((prev) => ({ ...prev, ...next })),
      [],
    );
    const handleSelectionChange = useCallback(
      (next: Partial<SelectionState>) => setSelectionState((prev) => ({ ...prev, ...next })),
      [],
    );
    const handleViewChange = useCallback(
      (next: Partial<ViewState>) => setViewState((prev) => ({ ...prev, ...next })),
      [],
    );
    const handleSelectedPrimitiveChange = useCallback(
      (primitive: Model.PrimitiveType) => setSelectedPrimitive(primitive),
      [],
    );
    const handleHueChange = useCallback(
      (hue: string) => {
        setSelectedHue(hue);
        // Update the selected object's color if one is selected.
        if (selectedObjectId && scene?.objects) {
          for (const ref of scene.objects) {
            const obj = ref?.target;
            if (obj && (obj as any).id === selectedObjectId) {
              Obj.change(obj, (o) => {
                o.color = hue;
              });
              break;
            }
          }
        }
      },
      [selectedObjectId, scene],
    );

    const handleAddObject = useCallback(() => {
      if (!scene) {
        return;
      }
      const object = Model.make({ primitive: selectedPrimitive, color: selectedHue });
      Obj.change(scene, (obj) => {
        obj.objects.push(Ref.make(object));
      });
      Obj.setParent(object, scene);
      // Select the newly created object.
      const objId = (object as any).id as string | undefined;
      if (objId) {
        setSelectedObjectId(objId);
      }
    }, [scene, selectedPrimitive, selectedHue]);

    const handleDeleteSelected = useCallback(() => {
      if (!selectedObjectId) {
        return;
      }

      // Remove from ECHO scene if it's an ECHO object.
      if (scene) {
        Obj.change(scene, (obj) => {
          const index = obj.objects.findIndex((ref) => (ref?.target as any)?.id === selectedObjectId);
          if (index !== -1) {
            obj.objects.splice(index, 1);
          }
        });
      }

      // Remove mesh + solid from canvas (covers both ECHO and imported objects).
      deleteObjectRef.current(selectedObjectId);

      setSelectedObjectId(null);
    }, [scene, selectedObjectId]);

    const handleImport = useCallback(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.glb,.gltf,.obj';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) {
          return;
        }
        if (file.name.endsWith('.obj')) {
          const text = await file.text();
          await importGLBRef.current(text);
        } else {
          const buffer = await file.arrayBuffer();
          await importGLBRef.current(buffer);
        }
      };
      input.click();
    }, []);

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

    // Sync hue picker with selected object's color.
    useEffect(() => {
      if (!selectedObjectId || !scene?.objects) {
        return;
      }
      for (const ref of scene.objects) {
        const obj = ref?.target;
        if (obj && (obj as any).id === selectedObjectId && (obj as any).color) {
          setSelectedHue((obj as any).color);
          return;
        }
      }
    }, [selectedObjectId, scene]);

    const editorActions: EditorActions = useMemo(
      () => ({
        onAddObject: handleAddObject,
        onDeleteSelected: handleDeleteSelected,
        onImport: handleImport,
        onExportSTL: handleExportSTL,
      }),
      [handleAddObject, handleDeleteSelected, handleImport, handleExportSTL],
    );

    useImperativeHandle(forwardedRef, () => ({
      setTool: handleToolChange,
    }));

    return (
      <SpacetimeEditorProvider
        scene={scene}
        toolState={toolState}
        onToolChange={handleToolChange}
        selectionState={selectionState}
        onSelectionChange={handleSelectionChange}
        viewState={viewState}
        onViewChange={handleViewChange}
        selectedPrimitive={selectedPrimitive}
        onSelectedPrimitiveChange={handleSelectedPrimitiveChange}
        selectedHue={selectedHue}
        onHueChange={handleHueChange}
        editorActions={editorActions}
        selectedObjectId={selectedObjectId}
        setSelectedObjectId={setSelectedObjectId}
        solidsRef={solidsRef}
        importGLBRef={importGLBRef}
        deleteObjectRef={deleteObjectRef}
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
  const {
    toolState,
    onToolChange,
    selectionState,
    onSelectionChange,
    viewState,
    onViewChange,
    selectedPrimitive,
    onSelectedPrimitiveChange,
    selectedHue,
    onHueChange,
    editorActions,
  } = useSpacetimeEditorContext(SPACETIME_EDITOR_TOOLBAR);

  return (
    <SpacetimeToolbar
      {...composableProps(props)}
      toolState={toolState}
      onToolChange={onToolChange}
      selectionState={selectionState}
      onSelectionChange={onSelectionChange}
      viewState={viewState}
      onViewChange={onViewChange}
      selectedPrimitive={selectedPrimitive}
      onSelectedPrimitiveChange={onSelectedPrimitiveChange}
      selectedHue={selectedHue}
      onHueChange={onHueChange}
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
  const {
    scene,
    toolState,
    selectionState,
    viewState,
    selectedHue,
    selectedObjectId,
    setSelectedObjectId,
    solidsRef: parentSolidsRef,
    importGLBRef: parentImportGLBRef,
    deleteObjectRef: parentDeleteObjectRef,
  } = useSpacetimeEditorContext(SPACETIME_EDITOR_CANVAS);
  // Subscribe to ECHO scene changes so we re-render when objects are added/removed.
  const [liveScene] = useObject(scene);
  const objectCount = liveScene?.objects?.length ?? 0;
  return (
    <SpacetimeCanvas
      {...composableProps(props)}
      scene={scene}
      tool={toolState.tool}
      selectionMode={selectionState.selectionMode}
      viewState={viewState}
      objectCount={objectCount}
      onSelectionChange={setSelectedObjectId}
      parentSolidsRef={parentSolidsRef}
      importGLBRef={parentImportGLBRef}
      deleteObjectRef={parentDeleteObjectRef}
      selectedObjectId={selectedObjectId}
      selectedHue={selectedHue}
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
