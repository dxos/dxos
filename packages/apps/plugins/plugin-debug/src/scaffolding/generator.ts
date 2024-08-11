//
// Copyright 2023 DXOS.org
//

import {
  createShapeId,
  defaultBindingUtils,
  defaultShapeUtils,
  defaultTools,
  Editor,
  type TLParentId,
} from '@tldraw/tldraw';

import { TLDrawStoreAdapter } from '@braneframe/plugin-sketch';
import { CanvasType, DiagramType, DocumentType, TextType, TLDRAW_SCHEMA } from '@braneframe/types';
import { sleep } from '@dxos/async';
import { next as A } from '@dxos/automerge/automerge';
import {
  SpaceObjectGenerator,
  type TestGeneratorMap,
  type TestMutationsMap,
  type TestSchemaMap,
} from '@dxos/echo-generator';
import { create } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { faker } from '@dxos/random';
import { createDocAccessor, type Space } from '@dxos/react-client/echo';

export enum SchemasNames {
  document = 'dxos.org/type/Document',
  diagram = 'dxos.org/type/Diagram',
}

export const SchemasMap: TestSchemaMap<SchemasNames> = {
  [SchemasNames.document]: DocumentType,
  [SchemasNames.diagram]: DiagramType,
};

export const ObjectGenerators: TestGeneratorMap<SchemasNames> = {
  [SchemasNames.document]: () => {
    const name = faker.lorem.sentence();
    return { name, content: create(TextType, { content: '' }), threads: [] };
  },

  [SchemasNames.diagram]: () => {
    const name = faker.lorem.sentence();
    return {
      name,
      canvas: create(CanvasType, { schema: TLDRAW_SCHEMA, content: {} }),
    };
  },
};

export const MutationsGenerators: TestMutationsMap<SchemasNames> = {
  [SchemasNames.document]: async (object, params) => {
    const accessor = createDocAccessor<DocumentType>(object.content, ['content']);

    for (let i = 0; i < params.count; i++) {
      const length = object.content?.content?.length ?? 0;
      accessor.handle.change((doc) => {
        A.splice(
          doc,
          accessor.path.slice(),
          0,
          params.maxContentLength >= length ? 0 : params.mutationSize,
          faker.string.hexadecimal({ length: params.mutationSize - 1 }) + ' ',
        );
      });

      // Release the event loop.
      if (i % 100 === 0 || i === params.count - 1) {
        log.info('Mutation:', { mutationIdx: i });
        await sleep(1);
      }
    }
  },

  [SchemasNames.diagram]: async (object, params) => {
    const store = new TLDrawStoreAdapter();
    await store.open(createDocAccessor<CanvasType>(object.canvas, ['content']));
    const app = new Editor({
      store: store.store!,
      shapeUtils: defaultShapeUtils,
      bindingUtils: defaultBindingUtils,
      tools: defaultTools,
      getContainer: () => document.getElementsByTagName('body')[0],
    });

    //
    // Draw spiral.
    //
    const r = 100;
    const a = 0.05;
    const cx = 200;
    const cy = 200;

    for (let i = 0; i < params.count; i++) {
      const t = i;
      const t1 = i + 1;
      const x = cx + a * t * r * Math.cos(t);
      const y = cy + a * t * r * Math.sin(t);
      const x1 = cx + a * t1 * r * Math.cos(t1);
      const y1 = cy + a * t1 * r * Math.sin(t1);

      app.createShape({
        id: createShapeId(),
        isLocked: false,
        meta: {},
        opacity: 1,
        parentId: 'page:page' as TLParentId,
        props: {
          arrowheadEnd: 'none',
          arrowheadStart: 'none',
          bend: 0,
          color: 'black',
          dash: 'draw',
          start: { x, y },
          end: { x: x1, y: y1 },
          fill: 'none',
          font: 'draw',
          labelColor: 'black',
          labelPosition: 0.5,
          scale: 1,
          size: 'm',
        },
        rotation: 0,
        type: 'arrow',
        typeName: 'shape',
        x: 0,
        y: 0,
      });

      // Release the event loop.
      if (i % 100 === 0) {
        await sleep(1);
      }
    }
  },
};

export const createSpaceObjectGenerator = (space: Space) =>
  new SpaceObjectGenerator(space, SchemasMap, ObjectGenerators, MutationsGenerators);
