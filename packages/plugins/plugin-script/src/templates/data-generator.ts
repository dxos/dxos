//
// Copyright 2025 DXOS.org
//

import {
  EchoObject,
  defineFunction,
  S,
  createStatic,
  Expando,
  TypedObject,
  Ref,
  LabelAnnotationId,
  // @ts-ignore
} from 'dxos:functions';
// @ts-ignore
import { randParagraph } from 'https://esm.sh/@ngneat/falso@7.1.1';

export class TextType extends TypedObject({ typename: 'dxos.org/type/Text', version: '0.1.0' })({
  content: S.String,
}) {}

export const DocumentSchema = S.Struct({
  name: S.optional(S.String),
  fallbackName: S.optional(S.String),
  content: Ref(TextType),
  threads: S.mutable(S.Array(Ref(Expando))),
}).annotations({
  [LabelAnnotationId]: ['name', 'fallbackName'],
});

export const DocumentType = DocumentSchema.pipe(EchoObject('dxos.org/type/Document', '0.1.0'));
export type DocumentType = S.Schema.Type<typeof DocumentType>;

export default defineFunction({
  inputSchema: S.Struct({
    documentAmount: S.optional(S.Number),
    textSize: S.optional(S.Number),
    mutationAmount: S.optional(S.Number),
  }),

  outputSchema: S.Struct({}),

  handler: async ({ event: { documentAmount = 10, textSize = 10, mutationAmount = 0 }, context: { space } }: any) => {
    await space.db.graph.schemaRegistry.addSchema([Expando]);

    const objects = [];
    // const rootCollection = await space.properties[COLLECTION_TYPENAME]?.load();
    for (let i = 0; i < documentAmount; i++) {
      const obj = space.db.add(
        createStatic(Expando, {
          name: 'scriptGenerated',
          content: randParagraph({ length: textSize }),
        }),
      );
      // rootCollection.objects.push(obj);
      objects.push(obj);
    }

    for (let i = 0; i < mutationAmount; i++) {
      const obj = objects[Math.floor(Math.random() * objects.length)];
      obj.content = randParagraph({ length: textSize });
    }

    await space.db.flush();
    // TODO(mykola): This seems to halp with propagating data to space.
    for (const obj of objects) {
      await space.db.query({ id: obj.id }).first();
      console.log('obj', obj.id);
    }
    return 'OK';
  },
});
