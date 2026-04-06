//
// Copyright 2026 DXOS.org
//

import { Atom, RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import { createContext } from '@radix-ui/react-context';
import React, {
  type PropsWithChildren,
  type RefObject,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useContext,
  forwardRef,
  useImperativeHandle,
} from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { composable, composableProps } from '@dxos/ui-theme';

import { type EditorState, DEFAULT_EDITOR_STATE, getSelectedObjectIds } from '../../tools';
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

  /** Atom holding unified editor state. */
  editorStateAtom: Atom.Writable<EditorState>;

  /** Actions. */
  editorActions: EditorActions;

  // Compatibility for toolbar (Task 5 removes these).
  toolState: ToolState;
  onToolChange: (next: Partial<ToolState>) => void;
  viewState: ViewState;
  onViewChange: (next: Partial<ViewState>) => void;
  propertiesState: PropertiesState;
  onPropertiesChange: (next: Partial<PropertiesState>) => void;
  selectionState: SelectionState;
  onSelectionChange: (next: Partial<SelectionState>) => void;
  selectedTemplate: Model.ObjectTemplate;
  onSelectedTemplateChange: (template: Model.ObjectTemplate) => void;

  /** Ref for dispatching actions through ToolManager. */
  handleActionRef: React.MutableRefObject<(actionId: string) => void>;

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

const SpacetimeEditorRoot = forwardRef<SpacetimeController, SpacetimeEditorRootProps>(
  ({ children, scene }, forwardedRef) => {
    const registry = useContext(RegistryContext);
    const editorStateAtom = useMemo(() => Atom.make<EditorState>({ ...DEFAULT_EDITOR_STATE }), []);
    const editorState = useAtomValue(editorStateAtom);

    const updateEditorState = useCallback(
      (next: Partial<EditorState>) => {
        registry.set(editorStateAtom, { ...registry.get(editorStateAtom), ...next });
      },
      [registry, editorStateAtom],
    );

    // Derive selection values from editor state.
    const selectedObjectIds = getSelectedObjectIds(editorState.selection);
    const selectedObjectId = selectedObjectIds[0] ?? null;

    const handleActionRef = useRef<(actionId: string) => void>(() => {});
    const solidsRef = useRef<Map<string, import('manifold-3d').Manifold> | null>(null);
    const importGLBRef = useRef<
      (data: ArrayBuffer | string) => Promise<{ vertexData: string; indexData: string } | undefined>
    >(async () => undefined);

    const dispatchAction = useCallback(
      (actionId: string): void => handleActionRef.current(actionId),
      [],
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
          hue: editorState.hue,
          solidsRef,
          importGLBRef,
          setSelectedObjectId: (id: string | null) => {
            if (id) {
              updateEditorState({ pendingSelectId: id });
            }
          },
        }),
      [scene, editorState.hue, selectedObjectId, updateEditorState],
    );

    const handleExport = useCallback(() => doExport({ selectedObjectId, solidsRef }), [selectedObjectId]);

    // Track whether hue change is programmatic (from object sync) to avoid infinite loop.
    const programmaticHueRef = useRef(false);

    // Sync hue picker with selected object's color when selection changes.
    useEffect(() => {
      if (!selectedObjectId || !scene?.objects) {
        return;
      }
      for (const ref of scene.objects) {
        const obj = ref?.target;
        if (obj && (obj as any).id === selectedObjectId && (obj as any).color) {
          programmaticHueRef.current = true;
          updateEditorState({ hue: (obj as any).color });
          return;
        }
      }
    }, [selectedObjectId, scene]);

    // Sync hue change to the ECHO object (skip when change was programmatic).
    useEffect(() => {
      if (programmaticHueRef.current) {
        programmaticHueRef.current = false;
        return;
      }
      if (!selectedObjectId || !scene?.objects) {
        return;
      }
      for (const ref of scene.objects) {
        const obj = ref?.target;
        if (obj && (obj as any).id === selectedObjectId) {
          Obj.change(obj, (draft) => {
            draft.color = editorState.hue;
          });
          break;
        }
      }
    }, [editorState.hue]);

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

    // Derive compatibility values from editorState for toolbar.
    const toolState = useMemo<ToolState>(() => ({ tool: editorState.tool as ToolState['tool'] }), [editorState.tool]);
    const viewState = useMemo<ViewState>(
      () => ({ showGrid: editorState.showGrid, showDebug: editorState.showDebug }),
      [editorState.showGrid, editorState.showDebug],
    );
    const propertiesState = useMemo<PropertiesState>(() => ({ hue: editorState.hue }), [editorState.hue]);
    const selectionState = useMemo<SelectionState>(
      () => ({ selectionMode: editorState.selectionMode, selectionCount: selectedObjectIds.length }),
      [editorState.selectionMode, selectedObjectIds.length],
    );

    const onToolChange = useCallback(
      (next: Partial<ToolState>) => updateEditorState(next as Partial<EditorState>),
      [updateEditorState],
    );
    const onViewChange = useCallback(
      (next: Partial<ViewState>) => updateEditorState(next as Partial<EditorState>),
      [updateEditorState],
    );
    const onPropertiesChange = useCallback(
      (next: Partial<PropertiesState>) => updateEditorState(next as Partial<EditorState>),
      [updateEditorState],
    );
    const onSelectionChange = useCallback(
      (next: Partial<SelectionState>) => updateEditorState(next as Partial<EditorState>),
      [updateEditorState],
    );
    const onSelectedTemplateChange = useCallback(
      (template: Model.ObjectTemplate) => updateEditorState({ selectedTemplate: template }),
      [updateEditorState],
    );

    useImperativeHandle(forwardedRef, () => ({
      setTool: onToolChange,
    }));

    return (
      <SpacetimeEditorProvider
        scene={scene}
        editorStateAtom={editorStateAtom}
        toolState={toolState}
        onToolChange={onToolChange}
        selectionState={selectionState}
        onSelectionChange={onSelectionChange}
        viewState={viewState}
        onViewChange={onViewChange}
        selectedTemplate={editorState.selectedTemplate}
        onSelectedTemplateChange={onSelectedTemplateChange}
        propertiesState={propertiesState}
        onPropertiesChange={onPropertiesChange}
        editorActions={editorActions}
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

type SpacetimeEditorCanvasProsp = Omit<
  SpacetimeCanvasProps,
  'showAxes' | 'showFps' | 'editorStateAtom' | 'scene' | 'objectCount' | 'parentSolidsRef' | 'importGLBRef' | 'handleActionRef'
>;

const SpacetimeEditorCanvas = composable<HTMLDivElement, SpacetimeEditorCanvasProsp>((props, forwardedRef) => {
  const {
    scene,
    editorStateAtom,
    solidsRef: parentSolidsRef,
    importGLBRef: parentImportGLBRef,
    handleActionRef: parentHandleActionRef,
  } = useSpacetimeEditorContext(SPACETIME_EDITOR_CANVAS);
  // Subscribe to ECHO scene changes so we re-render when objects are added/removed.
  const [liveScene] = useObject(scene);
  const objectCount = liveScene?.objects?.length ?? 0;
  return (
    <SpacetimeCanvas
      {...composableProps(props)}
      scene={scene}
      editorStateAtom={editorStateAtom}
      objectCount={objectCount}
      parentSolidsRef={parentSolidsRef}
      importGLBRef={parentImportGLBRef}
      handleActionRef={parentHandleActionRef}
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
