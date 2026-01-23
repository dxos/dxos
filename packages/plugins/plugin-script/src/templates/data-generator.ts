//
// Copyright 2025 DXOS.org
//

// @ts-ignore
import { Expando, S, create, defineFunction } from 'dxos:functions';
// @ts-ignore
import { randText } from 'https://esm.sh/@ngneat/falso@7.1.1?bundle=false';

export default defineFunction({
  key: 'dxos.org/script/data-generator',
  name: 'Data Generator',
  inputSchema: S.Struct({
    documentAmount: S.optional(S.Number),
    textSize: S.optional(S.Number),
    mutationAmount: S.optional(S.Number),
    waitAfterCreation: S.optional(S.Number),
  }),

  outputSchema: S.Struct({}),

  handler: async ({
    data: { documentAmount = 1, textSize = 10, mutationAmount = 0, waitAfterCreation = 10_000 },
    context: { space },
  }: any) => {
    await space.db.graph.schemaRegistry.register([Expando]);
    const result: Record<string, any> = {};
    const objects: Expando[] = [];

    // Create objects.
    for (let i = 0; i < documentAmount; i++) {
      const obj = space.db.add(
        create(Expando, {
          name: 'scriptGenerated',
          content: randText({ charCount: textSize }),
        }),
      );
      objects.push(obj);
      const objectResult: any = {};
      // Mutate the object.
      for (let i = 0; i < mutationAmount; i++) {
        obj.content = randText({ charCount: textSize });
      }
      objectResult.mutations = mutationAmount;
      objectResult.contentLength = obj.content.length;
      result[obj.id] = objectResult;
    }

    // Flush and wait for data to propagate.
    await space.db.flush();
    await new Promise((resolve) => setTimeout(resolve, waitAfterCreation));
    return { createdObjects: objects.length };
  },
});
