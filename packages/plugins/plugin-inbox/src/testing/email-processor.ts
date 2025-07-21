//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { type AiServiceClient, MixedStreamParser, createTool } from '@dxos/ai';
import { raise } from '@dxos/debug';
import { Obj } from '@dxos/echo';
import { failedInvariant } from '@dxos/invariant';
import { DataType } from '@dxos/schema';
import { type Testing } from '@dxos/schema/testing';

type ProcessEmailResult = {
  labels: string[];
  summary: string;
};

type ProcessEmailParams = {
  email: DataType.Message;
  aiClient: AiServiceClient;
  context: {
    labels: Testing.Label[];
    documents?: Testing.DocumentType[];
    contacts?: DataType.Person[];
  };
};

export const processEmail = async ({ aiClient, email, context }: ProcessEmailParams): Promise<ProcessEmailResult> => {
  const systemPrompt = `
  You are a helpful assistant that processes emails.
  You are given a set of labels and you need to choose one, multiple, or none to apply to the email.
  Also summarize the email in a few sentences.
  Call the submit_result tool to submit your result.

  Writing summaries:
  - Be concise and to the point.
  - Use the email to infer the summary.
  - Don't hallucinate.
  - Reference existing documents and contacts using the inline reference syntax.
  - Use references instead of the name of the document or contact.
  - Use references in the summary text if they are relevant.

  The inline reference syntax is as follows:
   - [<optional name>][<ID>] or just [<ID>]
   - Example: [Earnings Report][01JT0JP9AX0XKGZX4MV4B69VT6]

  Labels available:
   ${JSON.stringify(context.labels)}

  Context:
  ${JSON.stringify([...(context.contacts ?? []), ...(context.documents ?? [])])}
`;

  const messages = await new MixedStreamParser().parse(
    await aiClient.execStream({
      model: '@anthropic/claude-3-5-sonnet-20241022',
      systemPrompt,
      history: [
        Obj.make(DataType.Message, {
          created: new Date().toISOString(),
          sender: {
            role: 'user',
          },
          blocks: [
            {
              _tag: 'text',
              text: JSON.stringify({
                sender: email.sender,
                subject: email.properties?.subject,
                body: email.blocks.find((block) => block._tag === 'text')?.text,
              }),
            },
          ],
        }),
      ],
      tools: [
        createTool('test', {
          name: 'submit_result',
          description: 'Submit the result',
          schema: Schema.Struct({
            labels: Schema.Array(Schema.String).annotations({ description: 'The labels to apply to the email' }),
            summary: Schema.String.annotations({ description: 'A summary of the email' }),
          }),
          execute: async (params, context) => failedInvariant(),
        }),
      ],
    }),
  );
  const result: any =
    messages.find((message) => message.role === 'assistant')?.content.find((content) => content.type === 'tool_use')
      ?.input ?? raise(new Error('failed to process email'));

  return {
    labels: result.labels,
    summary: result.summary,
  };
};
