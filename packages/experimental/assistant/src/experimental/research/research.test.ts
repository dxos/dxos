import { log } from '@dxos/log';
import { describe, test } from 'vitest';
import { AIServiceEdgeClient, OllamaClient } from '../../ai-service';
import { AISession } from '../../session';
import { AI_SERVICE_ENDPOINT, ConsolePrinter } from '../../testing';
import { createExaTool } from './exa';
import INSTRUCTIONS from './instructions.tpl?raw';

const EXA_API_KEY = '9c7e17ff-0c85-4cd5-827a-8b489f139e03';
const REMOTE_AI = true;

const aiService = REMOTE_AI
  ? new AIServiceEdgeClient({
      endpoint: AI_SERVICE_ENDPOINT.REMOTE,
    })
  : new OllamaClient({
      overrides: {
        model: 'llama3.1:8b',
      },
    });

describe('Research', () => {
  test('should generate a research report', async () => {
    const searchTool = createExaTool({ apiKey: EXA_API_KEY });

    const session = new AISession({ operationModel: 'configured' });

    const printer = new ConsolePrinter();
    session.message.on((message) => printer.printMessage(message));
    session.userMessage.on((message) => printer.printMessage(message));
    session.block.on((block) => printer.printContentBlock(block));

    const result = await session.run({
      client: aiService,
      systemPrompt: INSTRUCTIONS,
      artifacts: [],
      tools: [searchTool],
      generationOptions: {
        model: '@anthropic/claude-3-5-sonnet-20241022',
      },
      history: [],
      prompt: 'What are the most promising alternatives to transformer-based LLMs for language modeling in 2024-2025?',
    });

    log.info('result', { result });
  });
});
