//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import React, { type PropsWithChildren, useCallback, useMemo, useRef, useState } from 'react';

import { type Camera, Canvas, type CanvasRootProps, useCanvasServices } from '@dxos/react-ui-canvas';
import { rootScene } from '@dxos/scene';

import {
  CanvasLayers,
  CanvasObjects,
  CanvasProperties,
  CanvasViews,
  type InspectorMode,
  useSelectionActions,
} from '../components/index.ts';
import { type EditorDisplay, SceneEditor, themeGridOf } from '../editor/index.ts';
import { createConfig2D } from './config2d.tsx';
import { Canvas2DHost, type Canvas2DHostProps } from './dimension2d.tsx';

/** The host's look, which the editor's display holds when the host does not control it. */
type LookProps = Pick<
  CanvasRootProps,
  'theme' | 'defaultTheme' | 'backgroundGrid' | 'onThemeChange' | 'onBackgroundGridChange'
>;

export type CanvasEditorRootProps = PropsWithChildren<
  Pick<
    CanvasRootProps,
    | 'document'
    | 'scene'
    | 'onIntent'
    | 'onModelIntent'
    | 'constrain'
    | 'nodes'
    | 'capabilities'
    | 'atoms'
    | 'readonly'
    | 'onReadonlyChange'
    | 'generators'
    | 'compileGenerator'
    | 'createGeneratorWorker'
  > &
    Canvas2DHostProps &
    LookProps & {
      /** Where the inspectors sit: floating over the canvas (the default), or docked in a column beside it. */
      inspectors?: InspectorMode;
      /**
       * Called when the dock is closed or an inspector's menu docks or floats them; the dock's close button and the menu
       * item show only when given, as the host owns `inspectors`.
       */
      onInspectorsChange?: (mode: InspectorMode) => void;
    }
>;

/** The camera the camera bar's percentage reads against: the scene's origin at 1:1. */
const AUTHORED_CAMERA: Camera = { x: 0, y: 0, zoom: 1 };

const ignoreIntent = () => {};

/** Commands on the engine's selection (group, ungroup, its class) at the start of the inspector panel's toolbar. */
const useEngineSelectionActions = () => {
  const { draw, atoms, store, capabilities, readonly, controller } = useCanvasServices('CanvasEditor.Inspector');
  const scene = useAtomValue(draw.scene);
  const selection = useAtomValue(atoms.selection);
  return useSelectionActions({ scene, selection, store, capabilities, readonly, controller });
};

/**
 * The shared scene editor with the 2D config, for a host with no history or codec of its own: the engine keeps its undo,
 * clipboard and context menu, and the host's look and motion props reach the engine as they change.
 */
const CanvasEditorRoot = ({
  document,
  scene,
  onIntent = ignoreIntent,
  onModelIntent,
  constrain,
  nodes,
  capabilities,
  atoms,
  readonly,
  onReadonlyChange,
  generators,
  compileGenerator,
  createGeneratorWorker,
  inspectors = 'floating',
  onInspectorsChange,
  theme,
  defaultTheme,
  backgroundGrid,
  onThemeChange,
  onBackgroundGridChange,
  drift,
  onViewChange,
  refitKey,
  refitDuration,
  children,
}: CanvasEditorRootProps) => {
  const config = useMemo(
    () =>
      createConfig2D({
        nodes,
        constrain,
        capabilities,
        atoms,
        generators,
        compileGenerator,
        createGeneratorWorker,
        standalone: true,
      }),
    [nodes, constrain, capabilities, atoms, generators, compileGenerator, createGeneratorWorker],
  );
  // The host's look where it controls it, this view's own choices otherwise, as the shared display panel sets them.
  const [own, setOwn] = useState<Partial<EditorDisplay>>({});
  const display = useMemo<EditorDisplay>(() => {
    const override = theme ?? own.themeOverride;
    const look = override ?? defaultTheme ?? 'flat';
    // Unset, the grid is the look's own, as the engine draws it for a host that picks none.
    const grid = backgroundGrid ?? (own.grid === false ? 'none' : (own.gridKind ?? themeGridOf(config.display, look)));
    return {
      theme: look,
      themeOverride: override,
      grid: grid !== 'none',
      ...(grid !== undefined && grid !== 'none' ? { gridKind: grid } : {}),
      snap: own.snap ?? true,
      guides: own.guides ?? true,
      axes: own.axes ?? false,
    };
  }, [config, theme, defaultTheme, backgroundGrid, own]);
  const latest = useRef({ onThemeChange, onBackgroundGridChange });
  latest.current = { onThemeChange, onBackgroundGridChange };
  const onDisplayChange = useCallback((next: Partial<EditorDisplay>) => {
    setOwn((current) => ({ ...current, ...next }));
    'themeOverride' in next && latest.current.onThemeChange?.(next.themeOverride);
    ('grid' in next || 'gridKind' in next) &&
      latest.current.onBackgroundGridChange?.(next.grid === false ? 'none' : next.gridKind);
  }, []);
  const host = useMemo<Canvas2DHostProps>(
    () => ({ drift, onViewChange, refitKey, refitDuration }),
    [drift, onViewChange, refitKey, refitDuration],
  );
  // Kept for this view alone, so the camera bar's zoom has a camera to read and move.
  const [camera, setCamera] = useState<Camera>();
  const onDockedChange = useMemo(
    () => onInspectorsChange && ((docked: boolean) => onInspectorsChange(docked ? 'docked' : 'floating')),
    [onInspectorsChange],
  );
  return (
    <Canvas2DHost value={host}>
      <SceneEditor.Root
        config={config}
        document={document}
        scene={scene ?? rootScene(document)?.id ?? ''}
        readonly={readonly}
        onReadonlyChange={onReadonlyChange}
        onIntent={onIntent}
        onModelIntent={onModelIntent}
        display={display}
        onDisplayChange={onDisplayChange}
        camera={camera}
        authoredCamera={AUTHORED_CAMERA}
        onCameraChange={setCamera}
        docked={inspectors === 'docked'}
        onDockedChange={onDockedChange}
        useInspectorActions={useEngineSelectionActions}
      >
        {children}
      </SceneEditor.Root>
    </Canvas2DHost>
  );
};

CanvasEditorRoot.displayName = 'CanvasEditor.Root';

/**
 * The standalone 2D canvas editor: `SceneEditor` with the 2D config (COMMON-CORE H.4), for hosts that draw a canvas with
 * no history or codec (its e2e suites, samples). Its crumbs, camera bar and tool rail are the shared editor's; its
 * actions, display panel and inspectors are the engine's own 2D editors, which the shared parts do not model yet.
 */
export const CanvasEditor = {
  Root: CanvasEditorRoot,
  Viewport: Canvas.Viewport,
  Navigation: SceneEditor.Navigation,
  Actions: SceneEditor.Actions,
  Camera: SceneEditor.Camera,
  Display: SceneEditor.Display,
  Tools: SceneEditor.Tools,
  Properties: CanvasProperties,
  Views: CanvasViews,
  Layers: CanvasLayers,
  Objects: CanvasObjects,
};
