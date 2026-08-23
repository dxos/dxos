//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';

import { AiService, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database } from '@dxos/echo';
import { registryLayerNoop } from '@dxos/echo/testing';
import { trim } from '@dxos/util';

import { Language, LingoOperation } from '#types';

const handler: Operation.WithHandler<typeof LingoOperation.TranslatePassage> = LingoOperation.TranslatePassage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* ({ text, language: languageRef }) {
        const language = yield* Database.load(languageRef);

        // Structured output rather than plain text: the source language is inferred by the model and
        // has to come back as its own field, not be parsed out of the prose.
        const { value } = yield* Effect.scoped(
          LanguageModel.generateObject({
            schema: Translated,
            prompt: trim`
              ${SYSTEM_PROMPT}

              Translate into: ${language.name} (${Language.getBaseCode(language)})

              ${text}
            `,
          }),
        );

        return { text: value.text || text, sourceCode: value.sourceCode };
      },
      Effect.provide(
        Layer.mergeAll(
          AiService.model('com.anthropic.model.claude-haiku-4-5.default'),
          ToolResolverService.layerEmpty,
          ToolExecutionService.layerEmpty,
          Trace.writerLayerNoop,
          registryLayerNoop,
        ),
      ),
    ),
  ),
);

export default handler;

/** The translation plus the language the passage turned out to be written in. */
const Translated = Schema.Struct({
  sourceCode: Schema.String.annotate({ description: 'BCP-47 tag of the language the passage is written in.' }),
  text: Schema.String.annotate({ description: 'The passage in the target language.' }),
});

const SYSTEM_PROMPT = trim`
  You translate a passage for a language learner reading it beside the original.

  Detect the language the passage is written in and report it as \`sourceCode\`; it is never given
  to you. If the passage is already in the target language, return it unchanged.

  # Rules
  - Translate the whole passage, not just isolated words.
  - Preserve the markdown structure exactly: the same headings, emphasis, list markers, blank lines
    and line breaks, so the two panes line up paragraph for paragraph.
  - Translate naturally rather than word for word, but do not summarize, expand or add commentary.

  # Output
  Return an object with \`sourceCode\` and \`text\`. \`text\` is the translated passage alone — no
  preamble, no commentary, no code fence around it.
`;
