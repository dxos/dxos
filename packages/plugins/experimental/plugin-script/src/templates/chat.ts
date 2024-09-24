//
// Copyright 2024 DXOS.org
//

// @ts-ignore
import { transformServerSentEvents } from 'https://esm.sh/@dxos/script-toolbox';

/**
 * Chatbot that answers questions based on the context data.
 */
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
    stream: true,
    prompt: `
     Using only the context data below to answer the user's question.
     If you cannot answer the question from the provided content, then reply with "I don't know."

     CONTEXT:
     ${context}

     QUESTION:
     ${await request.text()}
    `,
  });

  return new Response(transformServerSentEvents(answer));
};
