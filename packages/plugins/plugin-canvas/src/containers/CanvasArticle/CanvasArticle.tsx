//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import type * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import { SceneEditor } from '@dxos/react-ui-canvas-editor';
import * as Panel from '@dxos/react-ui/Panel';
import { Scene } from '@dxos/scene';

import { canvasDimension, sceneClipboardCodec } from '#model';
import { Canvas } from '#types';

import { CanvasEditCommands } from './CanvasEditCommands.tsx';
import { CanvasDatabaseContext } from './CanvasViewNodeView.tsx';
import { type SceneDimension } from './dimension.ts';
import { type CanvasEditorHost, useCanvasEditor } from './use-canvas-editor.ts';
import { useDimension2D } from './use-dimension2d.ts';
import { useDimension3D } from './use-dimension3d.ts';

export type CanvasArticleProps = IllustratorCapabilities.DrawingVariantSurfaceProps<Obj.Unknown>;

/**
 * The canvas variant's article, for either kind of scene: the shared scene editor over the open scene, with the
 * floating chrome (tools, actions, inspectors, display) around the viewport of the scene's dimension. Only the
 * dimension's config, display and camera differ; edits, undo, model edits, layers, the lock, the dock and the shots are
 * one path. A section or slide shows either as a picture.
 */
export const CanvasArticle = ({ canvas, role }: CanvasArticleProps) =>
  Canvas.isCanvas(canvas) ? <DimensionArticle canvas={canvas} role={role} /> : null;

CanvasArticle.displayName = 'CanvasArticle';

type DimensionArticleProps = { canvas: Canvas.Canvas; role?: string };

const DimensionArticle = ({ canvas, role }: DimensionArticleProps) => {
  useObject(canvas);
  return canvasDimension(canvas) === '3d' ? (
    <CanvasArticle3D canvas={canvas} role={role} />
  ) : (
    <CanvasArticle2D canvas={canvas} role={role} />
  );
};

const CanvasArticle2D = ({ canvas, role }: DimensionArticleProps) => {
  const host = useCanvasEditor(canvas, '2d');
  const dimension = useDimension2D(canvas);
  return <SceneEditorArticle canvas={canvas} role={role} host={host} dimension={dimension} />;
};

const CanvasArticle3D = ({ canvas, role }: DimensionArticleProps) => {
  const host = useCanvasEditor(canvas, '3d');
  const scene = Obj.instanceOf(Scene.Scene3D, host.stored) ? host.stored : undefined;
  const dimension = useDimension3D(canvas, scene, host.document?.scenes[0]?.theme);
  return <SceneEditorArticle canvas={canvas} role={role} host={host} dimension={dimension} />;
};

type SceneEditorArticleProps<C> = DimensionArticleProps & { host: CanvasEditorHost; dimension: SceneDimension<C> };

/** The shared editor over the host's scene, in the dimension's config. */
const SceneEditorArticle = <C,>({ canvas, role, host, dimension }: SceneEditorArticleProps<C>) => {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const { stored, document } = host;
  if (!stored || !document) {
    return null;
  }

  return (
    // A slide shows through the drawing, as a picture placed on it.
    <Panel.Root role={role} classNames={role === AppSurface.Slide.role ? 'bg-transparent' : undefined} ref={setElement}>
      <Panel.Body>
        <CanvasDatabaseContext.Provider value={Obj.getDatabase(canvas)}>
          <SceneEditor.Root
            config={dimension.config}
            document={document}
            scene={stored.key}
            role={role}
            readonly={host.readonly}
            onReadonlyChange={host.onReadonlyChange}
            onIntent={host.onIntent}
            history={host.history}
            onModelIntent={host.onModelIntent}
            readDocument={host.readDocument}
            onLayersChange={host.onLayersChange}
            codec={sceneClipboardCodec}
            display={dimension.display}
            onDisplayChange={dimension.onDisplayChange}
            camera={dimension.camera}
            authoredCamera={dimension.authoredCamera}
            onCameraChange={dimension.onCameraChange}
            refitKey={host.refitKey}
            docked={host.docked}
            onDockedChange={host.onDockedChange}
            sceneChoice={host.sceneChoice}
            shots={host.shots}
            onShotChange={host.onShotChange}
          >
            <CanvasEditCommands element={element} />
            <SceneEditor.Viewport>
              <SceneEditor.Navigation />
              <SceneEditor.Tools />
              <SceneEditor.Actions />
              <SceneEditor.Camera />
              <SceneEditor.Display />
              <SceneEditor.ContextMenu />
              <SceneEditor.Notice />
              <SceneEditor.Timeline />
            </SceneEditor.Viewport>
            <SceneEditor.Inspector catalogs={dimension.catalogs} />
          </SceneEditor.Root>
        </CanvasDatabaseContext.Provider>
      </Panel.Body>
    </Panel.Root>
  );
};
