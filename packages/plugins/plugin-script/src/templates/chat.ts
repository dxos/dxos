//
// Copyright 2024 DXOS.org
//

// @ts-ignore
import { transformServerSentEvents } from 'https://esm.sh/@dxos/script-toolbox?bundle=false';

/**
 * Chatbot that answers questions based on the context data.
 */
export default async ({ data: { bodyText }, context: { space, ai } }: any) => {
  let parsedRequest: any;
  try {
    parsedRequest = JSON.parse(bodyText);
  } catch (err) {
    const answer = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      stream: true,
      prompt: `
     Using only the context data below to answer the user's question.
     If you cannot answer the question from the provided content, then reply with "I don't know."

     CONTEXT:
     ${await getContext({ space })}

     QUESTION:
     ${bodyText}
    `,
    });
    return new Response(transformServerSentEvents(answer));
  }

  const promptId = parsedRequest.trigger.promptId;
  const promptObject = await space.crud.query({ id: promptId }).first();

  if (parsedRequest.data.objects.length !== 1) {
    return new Response('Message batches not supported.');
  }

  const messageId = parsedRequest.data.objects[0];
  let message;
  try {
    message = await space.crud.query({ id: messageId }).first();
  } catch (err) {
    return new Response('Message not replicated yet.', { status: 409 });
  }

  if (message.text.includes('--------')) {
    return new Response('Message was already processed.');
  }

  let prompt = promptObject.template;
  for (const input of promptObject.inputs) {
    let value: string | null = null;
    if (input.type === TemplateInputType.VALUE) {
      value = String(input.value);
    } else if (input.type === TemplateInputType.RETRIEVER) {
      value = await getContext({ space });
    } else if (input.type === TemplateInputType.PASS_THROUGH) {
      value = message.text;
    }
    if (value) {
      prompt = prompt.replaceAll(`{${input.name}}`, value);
    }
  }

  const answer = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
    stream: false,
    prompt,
  });
  const response = { response: answer.response, prompt, message };
  const textWithAnswer = message.text + '\n--------\n\n' + answer.response;
  await space.crud.update({ id: messageId }, { text: textWithAnswer });

  return new Response(JSON.stringify(response));
};

const getContext = async ({ space }: any) => {
  let context = '';
  const { objects: docs } = await space.crud.query({ __typename: 'dxos.org/type/Document' }).run();
  for (const doc of docs) {
    const { content } = await space.crud.query({ id: doc.content }).first();
    context += content + '\n\n';
  }
  return context;
};

enum TemplateInputType {
  VALUE = 0,
  PASS_THROUGH = 1,
  RETRIEVER = 2,
  FUNCTION = 3,
  QUERY = 4,
  RESOLVER = 5,
  CONTEXT = 6,
  SCHEMA = 7,
}
