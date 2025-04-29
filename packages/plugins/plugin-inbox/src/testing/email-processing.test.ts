import { defineTool, Message } from '@dxos/artifact';
import { AIServiceEdgeClient, MixedStreamParser } from '@dxos/assistant';
import { AI_SERVICE_ENDPOINT } from '@dxos/assistant/testing';
import { createStatic } from '@dxos/echo-schema';
import { failedInvariant } from '@dxos/invariant';
import { Schema } from 'effect';
import { describe, test } from 'vitest';
import { contacts, documents, emails, labels } from './test-data';
import { log } from '@dxos/log';

const aiService = new AIServiceEdgeClient({
  endpoint: AI_SERVICE_ENDPOINT.REMOTE,
});

describe('Email Processing', () => {
  test('content extraction', { timeout: 20_000 }, async () => {
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
         - Two square brackets containing the id of the document or contact.
         - Example: [[01JT0JP9AX0XKGZX4MV4B69VT6]]

        Labels available:
         ${JSON.stringify(labels)}

        Context:

        ${JSON.stringify([...Object.values(contacts), ...documents])}
      `;

    const email = emails[0];

    log.info('begin', { systemPrompt, email });

    const messages = await new MixedStreamParser().parse(
      await aiService.exec({
        model: '@anthropic/claude-3-5-sonnet-20241022',
        systemPrompt,
        history: [
          createStatic(Message, {
            role: 'user',
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  sender: email.sender,
                  subject: email.properties?.subject,
                  body: email.blocks.find((block) => block.type === 'text')?.text,
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
    log.info('done', messages);
  });
});
