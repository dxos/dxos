//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import type * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import { useAttention } from '@dxos/react-ui-attention';
import { Canvas2DHost, SceneEditor } from '@dxos/react-ui-canvas-editor';
import * as Panel from '@dxos/react-ui/Panel';
import { Scene } from '@dxos/scene';

import { canvasDimension, sceneClipboardCodec } from '#model';
import { Canvas } from '#types';

import { useCanvasLoaded } from '../CanvasStage/index.ts';
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
 * one path. A section or slide shows either as a picture; a section shows its breadcrumbs and zoom bar while attended.
 */
export const CanvasArticle = ({ canvas, ...props }: CanvasArticleProps) =>
  Canvas.isCanvas(canvas) ? <DimensionArticle canvas={canvas} {...props} /> : null;

CanvasArticle.displayName = 'CanvasArticle';

type DimensionArticleProps = Pick<CanvasArticleProps, 'role' | 'attendableId' | 'extrinsic'> & {
  canvas: Canvas.Canvas;
};

const DimensionArticle = (props: DimensionArticleProps) => {
  useObject(props.canvas);
  useCanvasLoaded(props.canvas);
  return canvasDimension(props.canvas) === '3d' ? <CanvasArticle3D {...props} /> : <CanvasArticle2D {...props} />;
};

const CanvasArticle2D = (props: DimensionArticleProps) => {
  const host = useCanvasEditor(props.canvas, '2d');
  const dimension = useDimension2D(props.canvas);
  return <SceneEditorArticle {...props} host={host} dimension={dimension} />;
};

const CanvasArticle3D = (props: DimensionArticleProps) => {
  const host = useCanvasEditor(props.canvas, '3d');
  const scene = Obj.instanceOf(Scene.Scene3D, host.stored) ? host.stored : undefined;
  const dimension = useDimension3D(props.canvas, scene, host.document?.scenes[0]?.theme);
  return <SceneEditorArticle {...props} host={host} dimension={dimension} />;
};

type SceneEditorArticleProps<C> = DimensionArticleProps & { host: CanvasEditorHost; dimension: SceneDimension<C> };

/** The shared editor over the host's scene, in the dimension's config. */
const SceneEditorArticle = <C,>({
  canvas,
  role,
  attendableId,
  extrinsic,
  host,
  dimension,
}: SceneEditorArticleProps<C>) => {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const { hasAttention } = useAttention(attendableId);
  const { stored, document } = host;
  if (!stored || !document) {
    return null;
  }

  const section = role === AppSurface.Section.role;
  const fit = { frame: host.frame, fitZoom: host.fitZoom };
  return (
    <Panel.Root
      role={role}
      classNames={
        // A slide shows through the drawing, as a picture placed on it. A section its host does not size (an embed with
        // no height of its own) takes its height from its width, since the panel's own would fill a parent of none.
        role === AppSurface.Slide.role ? 'bg-transparent' : section && !extrinsic ? 'aspect-video' : undefined
      }
      ref={setElement}
    >
      <Panel.Body>
        {/* What Fit frames and how far it may magnify, where the drawing says so: the 2D root reads them from here. */}
        <Canvas2DHost value={fit}>
          <CanvasDatabaseContext.Provider value={Obj.getDatabase(canvas)}>
            <SceneEditor.Root
              config={dimension.config}
              document={document}
              scene={stored.key}
              role={role}
              navigable={section && hasAttention}
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
        </Canvas2DHost>
      </Panel.Body>
    </Panel.Root>
  );
};
