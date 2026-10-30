//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import type * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import { SceneEditor } from '@dxos/react-ui-canvas/scene';
import * as Panel from '@dxos/react-ui/Panel';
import { Scene } from '@dxos/scene';

import { canvasDimension, sceneClipboardCodec } from '#model';
import { type Canvas } from '#types';

import { CanvasDatabaseContext } from '../CanvasArticle/CanvasViewNodeView.tsx';
import { useReconciledMigrations } from '../CanvasArticle/use-canvas-scene.ts';
import { type SceneDimension } from './dimension.ts';
import { SceneEditCommands } from './SceneEditCommands.tsx';
import { useDimension2D } from './use-dimension2d.ts';
import { useDimension3D } from './use-dimension3d.ts';
import { type SceneEditorHost, useSceneEditor } from './use-scene-editor.ts';

/** What a drawing surface passes a scene view, beside the canvas it shows. */
export type SceneSurfaceProps = Omit<IllustratorCapabilities.DrawingVariantSurfaceProps<Obj.Unknown>, 'canvas'>;

export type SceneArticleProps = SceneSurfaceProps & { canvas: Canvas.Canvas };

/**
 * A `Canvas` article for either kind of scene: the shared scene editor over the open scene, with the floating chrome
 * (tools, actions, inspectors, display) around the viewport of the scene's dimension. Only the dimension's config,
 * display and camera differ; edits, undo, model edits, layers, the lock, the dock and the shots are one path. A card,
 * section or slide shows either as a picture.
 */
export const SceneArticle = ({ canvas, ...props }: SceneArticleProps) => {
  useObject(canvas);
  useReconciledMigrations(props.drawing, canvas, props.role === AppSurface.Article.role);
  return canvasDimension(canvas) === '3d' ? (
    <SceneArticle3D canvas={canvas} role={props.role} />
  ) : (
    <SceneArticle2D canvas={canvas} role={props.role} />
  );
};

SceneArticle.displayName = 'SceneArticle';

type DimensionArticleProps = { canvas: Canvas.Canvas; role?: string };

const SceneArticle2D = ({ canvas, role }: DimensionArticleProps) => {
  const host = useSceneEditor(canvas, '2d');
  const dimension = useDimension2D(canvas);
  return <SceneEditorArticle canvas={canvas} role={role} host={host} dimension={dimension} />;
};

const SceneArticle3D = ({ canvas, role }: DimensionArticleProps) => {
  const host = useSceneEditor(canvas, '3d');
  const scene = Obj.instanceOf(Scene.Scene3D, host.stored) ? host.stored : undefined;
  const dimension = useDimension3D(canvas, scene, host.document?.scenes[0]?.theme);
  return <SceneEditorArticle canvas={canvas} role={role} host={host} dimension={dimension} />;
};

type SceneEditorArticleProps<C> = DimensionArticleProps & { host: SceneEditorHost; dimension: SceneDimension<C> };

/** The shared editor over the host's scene, in the dimension's config. */
const SceneEditorArticle = <C,>({ canvas, role, host, dimension }: SceneEditorArticleProps<C>) => {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const { stored, document } = host;
  if (!stored || !document) {
    return null;
  }

  return (
    <Panel.Root role={role} ref={setElement}>
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
            <SceneEditCommands element={element} />
            <SceneEditor.Viewport>
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
