//
// Copyright 2026 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ContentBlock } from '@dxos/types';
import { Message } from '@dxos/types';

import * as AiService from '../AiService';
import { agenticLoop } from './process-messages';
import { AiServiceTestingPreset } from './test-layers';

const EXAMPLE_PDF = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'TestData/test-pdf.pdf'));
const EXAMPLE_IMAGE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'TestData/test-image.jpg'));

class TestPdfToolkit extends Toolkit.make(
  Tool.make('getPdf', {
    success: ContentBlock.ContentBlockResult,
  }),
) {
  static readonly layer = TestPdfToolkit.toLayer({
    getPdf: Effect.fn(function* () {
      return ContentBlock.ContentBlockResult.make({
        content: [
          ContentBlock.File.make({
            name: 'file.pdf',
            mediaType: 'application/pdf',
            url: EXAMPLE_PDF.toString('base64url'),
          }),
        ],
      });
    }),
  });
}

class TestImageToolkit extends Toolkit.make(
  Tool.make('getImage', {
    success: ContentBlock.ContentBlockResult,
  }),
) {
  static readonly layer = TestImageToolkit.toLayer({
    getImage: Effect.fn(function* () {
      return ContentBlock.ContentBlockResult.make({
        content: [
          ContentBlock.Image.make({
            source: {
              type: 'base64',
              mediaType: 'image/jpeg',
              data: EXAMPLE_IMAGE.toString('base64'),
            },
          }),
        ],
      });
    }),
  });
}

const TestLayer = Layer.mergeAll(
  TestPdfToolkit.layer,
  TestImageToolkit.layer,
  AiService.model('com.anthropic.model.claude-opus-4-8.default').pipe(
    Layer.provideMerge(AiServiceTestingPreset('direct')),
  ),
);

describe('ContentBlockToolResult', { tags: ['manual'] }, () => {
  it.effect(
    'return image from tool result',
    Effect.fn(function* ({ expect }) {
      const messages = yield* agenticLoop({
        messages: [
          Message.make({
            sender: { role: 'user' },
            blocks: [ContentBlock.Text.make({ text: 'What is the image?' })],
          }),
        ],
        toolkit: TestImageToolkit,
      });

      expect(messages.length).toBeGreaterThan(1);
      expect(JSON.stringify(messages).toLowerCase()).toContain('kitten');
      expect(JSON.stringify(messages).toLowerCase()).toContain('orange');
    }, Effect.provide(TestLayer)),
  );

  it.effect(
    'return pdf from tool result',
    Effect.fn(function* ({ expect }) {
      const messages = yield* agenticLoop({
        messages: [
          Message.make({
            sender: { role: 'user' },
            blocks: [ContentBlock.Text.make({ text: 'What colors are the lines on the chart in the pdf file?' })],
          }),
        ],
        toolkit: TestPdfToolkit,
      });

      expect(messages.length).toBeGreaterThan(1);
      expect(JSON.stringify(messages).toLowerCase()).toContain('blue');
      expect(JSON.stringify(messages).toLowerCase()).toContain('red');
      expect(JSON.stringify(messages).toLowerCase()).toContain('green');
      expect(JSON.stringify(messages).toLowerCase()).toContain('purple');
    }, Effect.provide(TestLayer)),
  );
});
