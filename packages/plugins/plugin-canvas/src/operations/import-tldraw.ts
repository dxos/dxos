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

import { tldrawToViews } from '../import/index.ts';
import { seedContent, writeViews } from '../model/content.ts';
import { DrawingDialectError } from './canvas.ts';

const handler: Operation.WithHandler<typeof CanvasOperation.ImportTldraw> = CanvasOperation.ImportTldraw.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ drawing: sourceRef, name, snap }) {
      const source = yield* Database.load(sourceRef);
      const sourceCanvas = yield* Database.load(source.canvas);
      if (sourceCanvas.schema !== Canvas.TLDRAW_SCHEMA) {
        return yield* Effect.fail(
          new DrawingDialectError({ message: `Not a tldraw drawing: ${sourceCanvas.schema ?? '(no schema)'}.` }),
        );
      }

      const content: ContentMap = {};
      const root = seedContent(content);
      const { views, skipped, approximated } = tldrawToViews(sourceCanvas.content, { root, snap });
      writeViews(content, views);

      const canvas = yield* Database.add(Drawing.makeCanvas({ schema: Canvas.SCENE_SCHEMA, content }));
      const drawing = Drawing.make({ name: name ?? source.name, canvas });
      // Filed beside the source, else where a new drawing goes by default, so it shows in the navigator.
      const [beside] = yield* Database.query(ContainerModel.containing(source)).run;
      yield* ContainerModel.add({ object: drawing, target: beside ?? (yield* DefaultParent.resolve(drawing)) });

      const all = Object.values(views);
      return {
        drawing: Ref.make(drawing),
        nodes: all.reduce((sum, view) => sum + Object.keys(view.nodes).length, 0),
        links: all.reduce((sum, view) => sum + Object.keys(view.links).length, 0),
        skipped,
        approximated,
      };
    }),
  ),
);

export default handler;
