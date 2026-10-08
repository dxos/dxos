//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Prompt from 'effect/ai/Prompt';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { AiService } from '@dxos/ai';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Harness from '@dxos/assistant/Harness';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { contentCaptureAllowed } from '@dxos/observability/AiObservability';
import * as ObservabilityCapabilities from '@dxos/plugin-observability/ObservabilityCapabilities';

import { TurnReviewSkill } from '#skills';
import { AssistantCapabilities } from '#types';

import {
  REVIEW_MODEL,
  REVIEW_SYSTEM_PROMPT,
  STRUGGLE_EVENT,
  type TrajectoryHeader,
  TurnVerdict,
  formatReviewPrompt,
  isReportable,
  toStruggleEventProperties,
  toTrajectoryNdjson,
} from '../review/turn-review.ts';

// Never fails: it runs as a background hook after the user's turn, so a review that cannot complete
// is only logged.
const handler: Operation.WithHandler<typeof TurnReviewSkill.AnalyzeTurn> = TurnReviewSkill.AnalyzeTurn.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* () {
        const settings = Option.getOrUndefined(yield* Capabilities.getAtomValueOption(AssistantCapabilities.Settings));
        const observability = Option.getOrUndefined(
          yield* Capability.getOption(ObservabilityCapabilities.Observability),
        );
        // Both opt-ins are re-read here: the skill stays bound to a chat after the user opts out.
        if (!settings?.reportStruggles || !observability?.enabled) {
          return;
        }

        const chat = yield* Harness.getChat;
        const spaceId = Obj.getDatabase(chat)?.spaceId;
        if (!spaceId || !contentCaptureAllowed(spaceId)) {
          return;
        }

        const history = yield* Harness.history;
        if (history.length === 0) {
          return;
        }

        const { value: verdict } = yield* LanguageModel.generateObject({
          schema: TurnVerdict,
          objectName: 'turn_verdict',
          prompt: Prompt.setSystem(Prompt.make(formatReviewPrompt(history)), REVIEW_SYSTEM_PROMPT),
        }).pipe(Effect.provide(AiService.languageModel(REVIEW_MODEL)));
        log.info('turn reviewed', { chat: chat.id, struggled: verdict.struggled, cause: verdict.cause });
        if (!isReportable(verdict)) {
          return;
        }

        const binder = yield* Harness.binder;
        const feed = yield* Database.load(chat.feed);
        const header: TrajectoryHeader = {
          sessionId: Obj.getURI(feed, { prefer: 'absolute' }),
          model: chat.session?.model,
          codeMode: settings.codeMode ?? false,
          skills: binder
            .getSkills()
            .filter((skill) => Obj.getMeta(skill).key !== TurnReviewSkill.key)
            .map((skill) => skill.name),
          verdict,
        };
        const trajectoryKey = yield* Effect.promise(() =>
          observability.support.uploadNdjson(toTrajectoryNdjson(header, history), 'trajectory'),
        );
        observability.events.captureEvent(
          STRUGGLE_EVENT,
          toStruggleEventProperties({ ...header, history, trajectoryKey }),
        );
      },
      Effect.catchCause((cause) => Effect.sync(() => log.warn('turn review failed', { cause }))),
    ),
  ),
);

export default handler;
