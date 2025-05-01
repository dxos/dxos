import { defineTool, Message } from '@dxos/artifact';
import type { AIServiceClient } from '@dxos/assistant';
import { MixedStreamParser } from '@dxos/assistant';
import { raise } from '@dxos/debug';
import { create } from '@dxos/echo-schema';
import { failedInvariant } from '@dxos/invariant';
import type { ContactType, MessageType } from '@dxos/schema';
import { Schema } from 'effect';
import type { DocumentType, Label } from './test-data';

type ProcessEmailParams = {
  email: MessageType;
  aiService: AIServiceClient;
  context: {
    labels: Label[];
    documents?: DocumentType[];
    contacts?: ContactType[];
  };
};

type ProcessEmailResult = {
  labels: string[];
  summary: string;
};

export const processEmail = async (params: ProcessEmailParams): Promise<ProcessEmailResult> => {
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
   ${JSON.stringify(params.context.labels)}

  Context:

  ${JSON.stringify([...(params.context.contacts ?? []), ...(params.context.documents ?? [])])}
`;

  const messages = await new MixedStreamParser().parse(
    await params.aiService.exec({
      model: '@anthropic/claude-3-5-sonnet-20241022',
      systemPrompt,
      history: [
        create(Message, {
          role: 'user',
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                sender: params.email.sender,
                subject: params.email.properties?.subject,
                body: params.email.blocks.find((block) => block.type === 'text')?.text,
              }),
            },
          ],
        }),
      ],
      tools: [
        defineTool('test', {
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
