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
import { parseOBJ, presetObjData } from '../../engine';
import { useObject } from '@dxos/echo-react';
import { composable, composableProps } from '@dxos/ui-theme';

import { type Scene, Model } from '#types';
import { handleImport as doImport, handleExportSTL as doExportSTL } from './import-export';
import { SpacetimeCanvas, type SpacetimeCanvasProps } from '../SpacetimeCanvas';
import {
  type EditorActions,
  type PropertiesState,
  type SelectionState,
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
  propertiesState: PropertiesState;
  onPropertiesChange: (next: Partial<PropertiesState>) => void;

  /** Selection. */
  selectionState: SelectionState;
  onSelectionChange: (next: Partial<SelectionState>) => void;

  selectedObjectId: string | null;
  setSelectedObjectId: (id: string | null) => void;

  selectedTemplate: Model.ObjectTemplate;
  onSelectedTemplateChange: (template: Model.ObjectTemplate) => void;

  /** Ref for canvas to provide object deletion (disposes mesh + solid). */
  deleteObjectRef: RefObject<(objectId: string) => void>;

  /** Runtime Manifold solids (provided by canvas). */
  solidsRef: RefObject<Map<string, import('manifold-3d').Manifold> | null>;

  /** Ref for canvas to provide the import implementation (ArrayBuffer for GLB, string for OBJ). */
  importGLBRef: RefObject<
    (data: ArrayBuffer | string) => Promise<{ vertexData: string; indexData: string } | undefined>
  >;
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

const DEFAULT_SELECTION_STATE: SelectionState = { selectionMode: 'object' };
const DEFAULT_VIEW_STATE: ViewState = { showGrid: true, showDebug: false };

const SpacetimeEditorRoot = forwardRef<SpacetimeController, SpacetimeEditorRootProps>(
  ({ children, scene }, forwardedRef) => {
    const [toolState, setToolState] = useState<ToolState>({ tool: 'select' });
    const [selectionState, setSelectionState] = useState<SelectionState>(DEFAULT_SELECTION_STATE);
    const [viewState, setViewState] = useState<ViewState>(DEFAULT_VIEW_STATE);
    const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<Model.ObjectTemplate>('cube');
    const [propertiesState, setPropertiesState] = useState<PropertiesState>({ hue: 'blue' });
    const deleteObjectRef = useRef<(objectId: string) => void>(() => {});
    const solidsRef = useRef<Map<string, import('manifold-3d').Manifold> | null>(null);
    const importGLBRef = useRef<
      (data: ArrayBuffer | string) => Promise<{ vertexData: string; indexData: string } | undefined>
    >(async () => undefined);

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
    const handleSelectedTemplateChange = useCallback(
      (template: Model.ObjectTemplate) => setSelectedTemplate(template),
      [],
    );
    const handlePropertiesChange = useCallback(
      (next: Partial<PropertiesState>) => {
        setPropertiesState((prev) => ({ ...prev, ...next }));
        // Update the selected object's color if hue changed and an object is selected.
        if (next.hue && selectedObjectId && scene?.objects) {
          for (const ref of scene.objects) {
            const obj = ref?.target;
            if (obj && (obj as any).id === selectedObjectId) {
              Obj.change(obj, (o) => {
                o.color = next.hue!;
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
      const objData = presetObjData[selectedTemplate as Model.PresetType];
      if (objData) {
        // Preset: parse OBJ directly (no Manifold needed — works for non-watertight meshes too).
        const parsed = parseOBJ(objData);
        if (!parsed) {
          return;
        }
        const object = Model.make({
          primitive: undefined,
          label: selectedTemplate,
          mesh: {
            vertexData: Model.encodeTypedArray(parsed.positions),
            indexData: Model.encodeTypedArray(parsed.indices),
          },
          color: propertiesState.hue,
        });
        Obj.change(scene, (obj) => {
          obj.objects.push(Ref.make(object));
        });
        Obj.setParent(object, scene);
        const objId = (object as any).id as string | undefined;
        if (objId) {
          setSelectedObjectId(objId);
        }
      } else {
        // Primitive: create parametric object.
        const object = Model.make({ primitive: selectedTemplate as Model.PrimitiveType, color: propertiesState.hue });
        Obj.change(scene, (obj) => {
          obj.objects.push(Ref.make(object));
        });
        Obj.setParent(object, scene);
        const objId = (object as any).id as string | undefined;
        if (objId) {
          setSelectedObjectId(objId);
        }
      }
    }, [scene, selectedTemplate, propertiesState.hue]);

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

    const handleImport = useCallback(
      () =>
        doImport({
          scene,
          selectedObjectId,
          hue: propertiesState.hue,
          solidsRef,
          importGLBRef,
          setSelectedObjectId,
        }),
      [scene, propertiesState.hue],
    );

    const handleExportSTL = useCallback(() => doExportSTL({ selectedObjectId, solidsRef }), [selectedObjectId]);

    // Sync hue picker with selected object's color.
    useEffect(() => {
      if (!selectedObjectId || !scene?.objects) {
        return;
      }
      for (const ref of scene.objects) {
        const obj = ref?.target;
        if (obj && (obj as any).id === selectedObjectId && (obj as any).color) {
          setPropertiesState((prev) => ({ ...prev, hue: (obj as any).color }));
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
        selectedTemplate={selectedTemplate}
        onSelectedTemplateChange={handleSelectedTemplateChange}
        propertiesState={propertiesState}
        onPropertiesChange={handlePropertiesChange}
        editorActions={editorActions}
        selectedObjectId={selectedObjectId}
        setSelectedObjectId={setSelectedObjectId}
        deleteObjectRef={deleteObjectRef}
        solidsRef={solidsRef}
        importGLBRef={importGLBRef}
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

type SpacetimeEditorToolbarProps = Pick<SpacetimeToolbarProps, 'attendableId' | 'alwaysActive'>;

const SpacetimeEditorToolbar = composable<HTMLDivElement, SpacetimeEditorToolbarProps>(
  ({ attendableId, alwaysActive, ...props }, forwardedRef) => {
    const {
      toolState,
      onToolChange,
      selectionState,
      onSelectionChange,
      viewState,
      onViewChange,
      selectedTemplate,
      onSelectedTemplateChange,
      propertiesState,
      onPropertiesChange,
      editorActions,
    } = useSpacetimeEditorContext(SPACETIME_EDITOR_TOOLBAR);

    return (
      <SpacetimeToolbar
        {...composableProps(props)}
        attendableId={attendableId}
        alwaysActive={alwaysActive}
        toolState={toolState}
        onToolChange={onToolChange}
        selectionState={selectionState}
        onSelectionChange={onSelectionChange}
        viewState={viewState}
        onViewChange={onViewChange}
        selectedTemplate={selectedTemplate}
        onSelectedTemplateChange={onSelectedTemplateChange}
        propertiesState={propertiesState}
        onPropertiesChange={onPropertiesChange}
        editorActions={editorActions}
        ref={forwardedRef}
      />
    );
  },
);

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
    propertiesState,
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
      selectedHue={propertiesState.hue}
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
