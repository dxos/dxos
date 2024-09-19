//
// Copyright 2024 DXOS.org
//

import { transformServerSentEvents } from 'https://esm.sh/@dxos/script-toolbox';

export default async ({
  event: {
    data: { request },
  },
  context: { space, ai },
}: any) => {
  let context = '';
  const { objects: docs } = await space.crud.query({ __typename: 'dxos.org/type/Document' }).run();
  for (const doc of docs) {
    const { content } = await space.crud.query({ id: doc.content }).first();
    context += content + '\n\n';
  }

  const answer = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
    prompt: `
     Using the context data only to answer the user's question. 
     If you don't know the answer reply with "I don't know.".
     
     CONTEXT:
     ${context}

     QUESTION:
     ${await request.text()}
    `,
    stream: true,
  });

  return new Response(transformServerSentEvents(answer));
};
