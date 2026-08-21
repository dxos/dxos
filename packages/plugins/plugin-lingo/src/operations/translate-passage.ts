//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { AiService, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { AiRequest } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database } from '@dxos/echo';
import { registryLayerNoop } from '@dxos/echo/testing';
import { trim } from '@dxos/util';

import { Language, LingoOperation } from '#types';

import { lastText } from '../util';

const handler: Operation.WithHandler<typeof LingoOperation.TranslatePassage> = LingoOperation.TranslatePassage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* ({ text, language: languageRef }) {
        const language = yield* Database.load(languageRef);

        const result = yield* new AiRequest.Request({}).run({
          prompt: trim`
            Study language: ${language.name} (${language.code})
            Translate into: ${Language.getBaseCode(language)}

            ${text}
          `,
          system: SYSTEM_PROMPT,
          history: [],
        });

        // Falls back to the source: a failed translation leaves the pane readable rather than blank.
        return { text: Option.getOrElse(lastText(result), () => text) };
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

const SYSTEM_PROMPT = trim`
  You translate a passage for a language learner reading it beside the original.

  # Rules
  - Translate the whole passage, not just isolated words.
  - Preserve the markdown structure exactly: the same headings, emphasis, list markers, blank lines
    and line breaks, so the two panes line up paragraph for paragraph.
  - Translate naturally rather than word for word, but do not summarize, expand or add commentary.

  # Output
  Respond with the translated passage only — no preamble, no code fence.
`;
