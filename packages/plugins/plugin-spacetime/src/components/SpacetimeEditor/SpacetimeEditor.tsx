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

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { composable, composableProps } from '@dxos/ui-theme';

import { type EditorState, type ActionResult } from '../../tools';
import { type Scene, Model } from '../../types';
import { handleImport as doImport, handleExport as doExport } from './import-export';
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

  /** Ref for dispatching actions through ToolManager. */
  handleActionRef: React.MutableRefObject<(actionId: string, editorState: EditorState) => ActionResult | undefined>;

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
    const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
    const selectedObjectId = selectedObjectIds[0] ?? null;
    const setSelectedObjectId = useCallback((id: string | null) => {
      setSelectedObjectIds(id ? [id] : []);
    }, []);
    const [selectedTemplate, setSelectedTemplate] = useState<Model.ObjectTemplate>('cube');
    const [propertiesState, setPropertiesState] = useState<PropertiesState>({ hue: 'blue' });
    const handleActionRef = useRef<(actionId: string, editorState: EditorState) => ActionResult | undefined>(
      () => undefined,
    );
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

    const dispatchAction = useCallback(
      (actionId: string): void => {
        const editorState: EditorState = {
          selectedObjectIds,
          selectedTemplate,
          hue: propertiesState.hue,
        };
        const result = handleActionRef.current(actionId, editorState);
        if (result?.selectObjectIds) {
          setSelectedObjectIds(result.selectObjectIds);
        }
      },
      [selectedObjectIds, selectedTemplate, propertiesState.hue],
    );

    const handleAdd = useCallback(() => dispatchAction('add-object'), [dispatchAction]);
    const handleDeleteSelected = useCallback(() => dispatchAction('delete-objects'), [dispatchAction]);
    const handleJoinSelected = useCallback(() => dispatchAction('join-objects'), [dispatchAction]);
    const handleSubtractSelected = useCallback(() => dispatchAction('subtract-objects'), [dispatchAction]);

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

    const handleExport = useCallback(() => doExport({ selectedObjectId, solidsRef }), [selectedObjectId]);

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
        onAdd: handleAdd,
        onDeleteSelected: handleDeleteSelected,
        onJoinSelected: handleJoinSelected,
        onSubtractSelected: handleSubtractSelected,
        onImport: handleImport,
        onExport: handleExport,
      }),
      [handleAdd, handleDeleteSelected, handleImport, handleExport, handleJoinSelected, handleSubtractSelected],
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
        handleActionRef={handleActionRef}
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
    onToolChange,
    selectionState,
    viewState,
    propertiesState,
    selectedObjectId,
    setSelectedObjectId,
    solidsRef: parentSolidsRef,
    importGLBRef: parentImportGLBRef,
    handleActionRef: parentHandleActionRef,
    editorActions,
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
      handleActionRef={parentHandleActionRef}
      selectedObjectId={selectedObjectId}
      selectedHue={propertiesState.hue}
      onToolChange={onToolChange}
      onDelete={editorActions.onDeleteSelected}
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
