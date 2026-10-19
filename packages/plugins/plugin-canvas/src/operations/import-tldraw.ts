//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ContainerModel from '@dxos/app-toolkit/ContainerModel';
import * as DefaultParent from '@dxos/app-toolkit/DefaultParent';
import * as Operation from '@dxos/compute/Operation';
import { type ContentMap } from '@dxos/diagram';
import { Database, Ref } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';

import { Canvas, CanvasOperation } from '#types';

import { tldrawToScenes } from '../import/index.ts';
import { seedContent, writeScenes } from '../model/content.ts';
import { DrawingDialectError } from './canvas.ts';

const handler: Operation.WithHandler<typeof CanvasOperation.ImportTldraw> = CanvasOperation.ImportTldraw.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ drawing: sourceRef, name }) {
      const source = yield* Database.load(sourceRef);
      const sourceCanvas = yield* Database.load(source.canvas);
      if (sourceCanvas.schema !== Canvas.TLDRAW_SCHEMA) {
        return yield* Effect.fail(
          new DrawingDialectError({ message: `Not a tldraw drawing: ${sourceCanvas.schema ?? '(no schema)'}.` }),
        );
      }

      const content: ContentMap = {};
      const root = seedContent(content);
      const { scenes, skipped, approximated } = tldrawToScenes(sourceCanvas.content, { root });
      writeScenes(content, scenes);

      const canvas = yield* Database.add(Drawing.makeCanvas({ schema: Canvas.SCENE_SCHEMA, content }));
      const drawing = Drawing.make({ name: name ?? source.name, canvas });
      // Filed where a new drawing goes by default (the space's root collection), so it shows in the navigator.
      yield* ContainerModel.add({ object: drawing, target: yield* DefaultParent.resolve(drawing) });

      const elements = Object.values(scenes);
      return {
        drawing: Ref.make(drawing),
        nodes: elements.reduce((sum, scene) => sum + Object.keys(scene.nodes).length, 0),
        links: elements.reduce((sum, scene) => sum + Object.keys(scene.links).length, 0),
        skipped,
        approximated,
      };
    }),
  ),
);

export default handler;
