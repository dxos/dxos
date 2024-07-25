//
// Copyright 2023 DXOS.org
//

import { CanvasType, DiagramType, DocumentType, TextType, TLDRAW_SCHEMA } from '@braneframe/types';
import { next as A } from '@dxos/automerge/automerge';
import { createDocAccessor, type Space } from '@dxos/client/echo';
import {
  randomText,
  SpaceObjectGenerator,
  type TestGeneratorMap,
  type TestMutationsMap,
  type TestSchemaMap,
  TestSchemaType,
} from '@dxos/echo-generator';
import { create } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { range } from '@dxos/util';

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
    const content = range(faker.number.int({ min: 2, max: 8 }))
      .map(() => faker.lorem.sentences(faker.number.int({ min: 2, max: 16 })))
      .join('\n\n');

    return create(DocumentType, { name, content: create(TextType, { content }), threads: [] });
  },

  [SchemasNames.diagram]: () => {
    const name = faker.lorem.sentence();
    return create(DiagramType, {
      name,
      canvas: create(CanvasType, { schema: TLDRAW_SCHEMA, content: {} }),
    });
  },
};

export const MutationsGenerators: TestMutationsMap<SchemasNames> = {
  [SchemasNames.document]: (object, params) => {
    const accessor = createDocAccessor(object, ['content']);
    const length = object.content?.content?.length ?? 0;
    accessor.handle.change((doc) => {
      A.splice(
        doc,
        accessor.path.slice(),
        0,
        params.maxContentLength >= length ? 0 : params.mutationSize,
        randomText(params.mutationSize),
      );
    });
  },

  [SchemasNames.diagram]: (object, params) => {
    throw new Error('Not implemented');
  },
};

export const defaultCount: Partial<Record<TestSchemaType, number>> = {
  [TestSchemaType.organization]: 40,
  [TestSchemaType.project]: 80,
  [TestSchemaType.contact]: 160,
};

export const createSpaceObjectGenerator = (space: Space) =>
  new SpaceObjectGenerator(space, SchemasMap, ObjectGenerators, MutationsGenerators);
