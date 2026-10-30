//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

import { type GraphDiagnostic } from '@dxos/conductor';
import { useObjectValue } from '@dxos/echo-react';
import {
  type Camera,
  type EditorDisplay,
  SceneEditor,
  createHistory,
  sessionHistory,
  useSceneEditor,
} from '@dxos/react-ui-canvas';
import { type LayoutIntent, findLayout } from '@dxos/scene';

import { type ComputeGraphController } from '../../graph/index.ts';
import { ComputeContext } from '../../hooks/index.ts';
import {
  Bullets,
  boardDocument,
  createBoardStore,
  createComputeConfig,
  createComputeProjection,
} from '../../scene/index.ts';
import { type CanvasBoard } from '../../types/index.ts';
import { DiagnosticOverlay } from '../DiagnosticOverlay.tsx';

/** The camera the camera bar resets to: the board's origin at 1:1. */
const AUTHORED_CAMERA: Camera = { x: 0, y: 0, zoom: 1 };

const DEFAULT_DISPLAY: EditorDisplay = { theme: 'flat', grid: true, snap: true, guides: true, axes: false };

export type ComputeBoardProps = {
  board: CanvasBoard.CanvasBoard;
  controller: ComputeGraphController;
  /** Only an article (or no role) edits; a card or section draws the board as a picture. */
  role?: string;
};

/**
 * A compute board in the shared scene editor (COMMON-CORE.md decision 10): the board's graph read as a 2D layout,
 * every edit a `LayoutIntent` written back to the board and mirrored into its compute graph, with field-level undo for
 * the session.
 */
export const ComputeBoard = ({ board, controller, role }: ComputeBoardProps) => {
  const snapshot = useObjectValue(board);
  const config = useMemo(() => createComputeConfig({ controller }), [controller]);
  const store = useMemo(
    () => createBoardStore(board, { projection: createComputeProjection({ controller }) }),
    [board, controller],
  );
  const document = useMemo(() => boardDocument(store.read()), [store, snapshot]);
  const history = useMemo(() => createHistory({ steps: sessionHistory(board), source: store.source }), [board, store]);
  const handleIntent = useCallback((_layout: string, intent: LayoutIntent) => store.write(intent), [store]);

  const [display, setDisplay] = useState<EditorDisplay>(DEFAULT_DISPLAY);
  const handleDisplayChange = useCallback(
    (next: Partial<EditorDisplay>) => setDisplay((current) => ({ ...current, ...next })),
    [],
  );
  const [camera, setCamera] = useState<Camera>();
  const [docked, setDocked] = useState(false);
  const [readonly, setReadonly] = useState(false);

  const [diagnostics, setDiagnostics] = useState<GraphDiagnostic[]>([]);
  useEffect(() => {
    void controller.checkGraph().then(() => setDiagnostics(controller.diagnostics));
  }, [controller, snapshot]);

  return (
    <SceneEditor.Root
      config={config}
      document={document}
      scene={store.layout}
      role={role}
      readonly={readonly}
      onReadonlyChange={setReadonly}
      onIntent={handleIntent}
      history={history}
      display={display}
      onDisplayChange={handleDisplayChange}
      camera={camera}
      authoredCamera={AUTHORED_CAMERA}
      onCameraChange={setCamera}
      docked={docked}
      onDockedChange={setDocked}
    >
      <ComputeResize controller={controller}>
        <SceneEditor.Viewport>
          <SceneEditor.Tools />
          <SceneEditor.Actions />
          <SceneEditor.Camera />
          <SceneEditor.Display />
          <SceneEditor.ContextMenu />
          <SceneEditor.Notice />
          <Bullets controller={controller} />
          <DiagnosticOverlay diagnostics={diagnostics} />
        </SceneEditor.Viewport>
        <SceneEditor.Inspector />
      </ComputeResize>
    </SceneEditor.Root>
  );
};

/** The compute context for the shapes, whose function body grows its node through the editor so the step undoes. */
const ComputeResize = ({ controller, children }: PropsWithChildren<{ controller: ComputeGraphController }>) => {
  const { document, layout, onIntent } = useSceneEditor('ComputeResize');
  const resize = useCallback(
    (id: string, delta: number) => {
      const record = layout === undefined ? undefined : findLayout(document, layout);
      const size = record?.dim === '2d' ? record.elements[id]?.size : undefined;
      if (layout !== undefined && size) {
        onIntent(layout, { kind: 'update', id, path: ['size'], value: { ...size, height: size.height + delta } });
      }
    },
    [document, layout, onIntent],
  );
  const context = useMemo(() => ({ controller, resize }), [controller, resize]);
  return <ComputeContext.Provider value={context}>{children}</ComputeContext.Provider>;
};
