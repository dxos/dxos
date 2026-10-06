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
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { contentCaptureAllowed } from '@dxos/observability/AiObservability';
import * as ObservabilityCapabilities from '@dxos/plugin-observability/ObservabilityCapabilities';
import { Message } from '@dxos/types';

import { AssistantCapabilities, AssistantOperation } from '#types';

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

// Never fails: it runs detached after the user's turn, so a review that cannot complete is only logged.
const handler: Operation.WithHandler<typeof AssistantOperation.ReviewTurn> = AssistantOperation.ReviewTurn.pipe(
  Operation.withHandler(
    Effect.fnUntraced(
      function* ({ chat, outcome, error, since, model, skills }) {
        const settings = Option.getOrUndefined(yield* Capabilities.getAtomValueOption(AssistantCapabilities.Settings));
        const observability = Option.getOrUndefined(
          yield* Capability.getOption(ObservabilityCapabilities.Observability),
        );
        // Both opt-ins are re-read here rather than trusted from the scheduler, which may be a stale render.
        if (!settings?.reportStruggles || !observability?.enabled) {
          return;
        }

        const spaceId = Obj.getDatabase(chat)?.spaceId;
        if (!spaceId || !contentCaptureAllowed(spaceId)) {
          return;
        }

        const feed = yield* Database.load(chat.feed);
        const history = yield* Feed.query(feed, Filter.type(Message.Message)).run;
        if (history.length === 0) {
          return;
        }

        const { value: verdict } = yield* LanguageModel.generateObject({
          schema: TurnVerdict,
          objectName: 'turn_verdict',
          prompt: Prompt.setSystem(
            Prompt.make(formatReviewPrompt({ history, since, outcome, error })),
            REVIEW_SYSTEM_PROMPT,
          ),
        }).pipe(Effect.provide(AiService.languageModel(REVIEW_MODEL)));
        log.info('turn reviewed', { chat: chat.id, struggled: verdict.struggled, cause: verdict.cause });
        if (!isReportable(verdict)) {
          return;
        }

        const header: TrajectoryHeader = {
          sessionId: Obj.getURI(feed, { prefer: 'absolute' }),
          outcome,
          error,
          since,
          model,
          codeMode: settings.codeMode ?? false,
          skills,
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
