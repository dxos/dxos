import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ContentBlock } from '@dxos/types';
import { Tool, Toolkit } from '@effect/ai';
import { describe, it } from '@effect/vitest';
import { Effect, Layer } from 'effect';

import { Message } from '@dxos/types';
import * as AiService from '../AiService';
import { agenticLoop } from './process-messages';
import { AiServiceTestingPreset } from './test-layers';

const EXAMPLE_PDF = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'TestData/test-pdf.pdf'),
);
const EXAMPLE_IMAGE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'TestData/test-image.jpg'),
);

class TestToolkit extends Toolkit.make(
  Tool.make('getPdf', {
    success: ContentBlock.ContentBlockResult
  }),
  Tool.make('getImage', {
    success: ContentBlock.ContentBlockResult
  })
) {
  static readonly layer = TestToolkit.toLayer({
    getPdf: Effect.fn(function* () {
      return ContentBlock.ContentBlockResult.make({
        content: [ContentBlock.File.make({
          name: 'file.pdf',
          mediaType: 'application/pdf',
          url: EXAMPLE_PDF.toString('base64url'),
        })],
      });
    }),
    getImage: Effect.fn(function* () {
      return ContentBlock.ContentBlockResult.make({
        content: [ContentBlock.Image.make({
          source: {
            type: 'base64',
            mediaType: 'image/jpeg',
            data: EXAMPLE_IMAGE.toString('base64'),
          }
        })],
      });
    }),
  });
}

const TestLayer = Layer.mergeAll(
  TestToolkit.layer,
  AiService.model('@anthropic/claude-sonnet-4-5').pipe(
    Layer.provideMerge(AiServiceTestingPreset('direct')),
  ),
);


describe('ContentBlockToolResult', () => {

  it.effect('return image from tool result', Effect.fn(
    function* ({ expect }) {
      const messages = yield* agenticLoop({
        messages: [
          Message.make({
            sender: { role: 'user' },
            blocks: [ContentBlock.Text.make({ text: 'What is the image?' })],
          }),
        ],
        toolkit: TestToolkit,
      });

      expect(messages.length).toBeGreaterThan(1);
    },
    Effect.provide(
      TestLayer,
    )
  ));

  it.effect.only('return pdf from tool result', Effect.fn(
    function* ({ expect }) {
      const messages = yield* agenticLoop({
        messages: [
          Message.make({
            sender: { role: 'user' },
            blocks: [ContentBlock.Text.make({ text: 'What colors are the lines on the chart in the pdf file?' })],
          }),
        ],
        toolkit: TestToolkit,
      });

      expect(messages.length).toBeGreaterThan(1);
    },
    Effect.provide(
      TestLayer,
    ),
  ));
});