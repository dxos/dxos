//
// Copyright 2024 DXOS.org
//

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

  // Transform event stream into raw text.
  const { readable, writable } = new TransformStream({
    transform: (chunk, controller) => {
      controller.enqueue(
        new TextEncoder().encode(JSON.parse(new TextDecoder().decode(chunk).slice('data: '.length)).response),
      );
    },
  });
  answer.pipeTo(writable);
  return new Response(readable);
};
