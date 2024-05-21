//
// Copyright 2023 DXOS.org
//

import { dirname, join } from 'node:path';

import { describe, test } from '@dxos/test';

describe('Search', () => {
  test.skip('search', async () => {
    // eslint-disable-next-line no-eval
    const { TextEmbedder, FilesetResolver } = await eval("import('@mediapipe/tasks-text')");

    const textFiles = await FilesetResolver.forTextTasks(
      join(dirname(require.resolve('@mediapipe/tasks-text')), 'wasm'),
    );
    const textEmbedder = await TextEmbedder.createFromOptions(textFiles, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/text_embedder/universal_sentence_encoder/float32/1/universal_sentence_encoder.tflite',
      },
    });

    const openaiEmbed = async (text: string) => {
      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          input: text,
          model: 'text-embedding-ada-002',
        }),
      });
      const j = await res.json();
      return {
        embeddings: [
          {
            headIndex: 1,
            headName: 'response_encoding',
            floatEmbedding: j.data[0].embedding,
          },
        ],
      };
    };

    const USE_OPENAI = true;

    const embed = async (text: string) => {
      return USE_OPENAI ? await openaiEmbed(text) : await textEmbedder.embed(text);
    };

    const objects = [
      `Copyright 2023 The MediaPipe Authors.

      Licensed under the Apache License, Version 2.0 (the "License");
      you may not use this file except in compliance with the License.
      You may obtain a copy of the License at`,

      'dog',

      'The second problem is that lexical search requires a domain-specific language to get results for anything more than a stack of keywords. It’s not intuitive to most people to have to use specialized punctuation and boolean operators to get what you want.',
    ];

    const query = 'license';

    const queryVector = await embed(query);

    // const similarity = (a: any, b: any) => {
    //   let r = 0;
    //   for(let i = 0; i < a.floatEmbedding.length; i++) {
    //     r += a.floatEmbedding[i] * b.floatEmbedding[i];
    //   }
    //   return r;
    // }

    const results = await Promise.all(
      objects.map(async (text) => {
        const vector = await embed(text);

        const similarity = TextEmbedder.cosineSimilarity(vector.embeddings[0], queryVector.embeddings[0]);
        return { text, similarity };
      }),
    );

    results.sort((a, b) => b.similarity - a.similarity);

    console.log({ query });
    console.log(results);
  });
});
