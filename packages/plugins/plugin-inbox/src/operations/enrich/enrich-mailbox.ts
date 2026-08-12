//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import { PROGRESS_STATUS_CANCELLED, PROGRESS_STATUS_COMPLETE, PROGRESS_STATUS_FAILED } from '@dxos/app-toolkit';
import * as Cancellation from '@dxos/compute/Cancellation';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';

import * as InboxOperation from '../../types/InboxOperation';

/** One spawned pipeline: the tier it belongs to, and the invocation, held unevaluated until its turn. */
type Stage = {
  readonly tier: InboxOperation.MailboxTier;
  readonly operation: string;
  /** Reason the stage cannot run (reported as `skipped` rather than attempted). */
  readonly skip?: string;
  readonly run: Effect.Effect<unknown, unknown, Operation.Service>;
};

type StageResult = {
  readonly tier: InboxOperation.MailboxTier;
  readonly operation: string;
  readonly status: 'completed' | 'failed' | 'skipped' | 'cancelled';
  readonly output?: unknown;
  readonly error?: string;
};

/**
 * Runs the mailbox pipelines as a cascade, each tier's output gating the next: deterministic
 * extraction (contacts + subscriptions) → cheap LLM classification → optional per-message analysis.
 *
 * Sequencing is the whole point. Classification consults the Person objects the contact stage
 * creates — a known sender is tagged personal, never spam, and never sent to the model — so running
 * the tiers out of order (or classifying a mailbox whose contacts were never extracted) silently
 * pays full price for a weaker verdict. Ordering the spawns here also makes the cursor watermark
 * hold by construction: no tier can advance past one that has not yet seen the same messages.
 *
 * Each spawned operation keeps its own cursor, batch cap, idempotency and services, so this handler
 * adds no pipeline logic — it decides what runs, in what order, and what to do when a stage fails.
 */
const handler = InboxOperation.EnrichMailbox.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({
      mailbox: mailboxRef,
      me = [],
      tiers = InboxOperation.DEFAULT_ENRICH_MAILBOX_TIERS,
      batchLimit,
      model,
      provider,
      strict,
      continueOnError = false,
    }) {
      const mailbox = yield* Database.load(mailboxRef);
      const signal = yield* Cancellation.signal;

      const traceWriter = yield* Trace.TraceService;
      const progressKey = InboxOperation.createEnrichProgressKey(mailbox);
      // Both counters are held across updates: a meter reads the LATEST status, so emitting an
      // undefined total on a current-only tick would blank the denominator mid-cascade.
      let current = 0;
      let total: number | undefined;
      const reportStatus = (patch: { message?: string; current?: number; total?: number } = {}) => {
        current = patch.current ?? current;
        total = patch.total ?? total;
        traceWriter.write(Trace.StatusUpdate, {
          message: patch.message ?? mailbox.name ?? 'Mailbox',
          progress: { key: progressKey, current, total },
        });
      };

      // The plan is built up front so the cascade is inspectable as data (and the progress total is
      // known before the first spawn). `Operation.invoke` returns a lazy Effect — nothing runs here.
      //
      // `tiers` selects WHICH tiers run, never their order: each tier consumes what the ones before
      // it wrote, so the stages are always flattened in the canonical cascade order below. A caller
      // asking for `['summarize', 'deterministic']` gets the same run as `['deterministic',
      // 'summarize']` rather than a cascade that summarizes against contacts it has not extracted.
      const plan: Record<InboxOperation.MailboxTier, () => Stage[]> = {
        deterministic: () => [
          {
            tier: 'deterministic',
            operation: InboxOperation.ExtractCorrespondents.meta.key.toString(),
            // Correspondence is derived relative to the user's own addresses; without them
            // `deriveCorrespondents` returns nothing, so an empty run would report a misleading zero.
            skip: me.length === 0 ? 'no identity addresses supplied' : undefined,
            run: Operation.invoke(InboxOperation.ExtractCorrespondents, { mailbox: Ref.make(mailbox), me }),
          },
          {
            tier: 'deterministic',
            operation: InboxOperation.ExtractSubscriptions.meta.key.toString(),
            run: Operation.invoke(InboxOperation.ExtractSubscriptions, { mailbox: Ref.make(mailbox) }),
          },
        ],
        classify: () => [
          {
            tier: 'classify',
            operation: InboxOperation.ClassifyMailbox.meta.key.toString(),
            run: Operation.invoke(InboxOperation.ClassifyMailbox, {
              mailbox: Ref.make(mailbox),
              batchLimit,
              model,
              strict,
            }),
          },
        ],
        summarize: () => [
          {
            tier: 'summarize',
            operation: InboxOperation.SummarizeMailbox.meta.key.toString(),
            run: Operation.invoke(InboxOperation.SummarizeMailbox, { mailbox: Ref.make(mailbox), model }),
          },
        ],
        analyze: () => [
          {
            tier: 'analyze',
            operation: InboxOperation.AnalyzeMailbox.meta.key.toString(),
            run: Operation.invoke(InboxOperation.AnalyzeMailbox, {
              mailbox: Ref.make(mailbox),
              model,
              provider,
              strict,
            }),
          },
        ],
      };

      const selected = new Set(tiers);
      const stages: Stage[] = InboxOperation.MAILBOX_TIER_ORDER.filter((tier) => selected.has(tier)).flatMap((tier) =>
        plan[tier](),
      );

      log.info('enrich: cascade start', { mailbox: Obj.getURI(mailbox), tiers, stages: stages.length });
      reportStatus({ current: 0, total: stages.length });

      const results: StageResult[] = [];
      let index = 0;
      for (const stage of stages) {
        index += 1;
        if (signal.aborted) {
          // Remaining stages are reported rather than dropped: a half-run cascade must be legible.
          results.push({ tier: stage.tier, operation: stage.operation, status: 'cancelled' });
          continue;
        }
        if (stage.skip) {
          results.push({ tier: stage.tier, operation: stage.operation, status: 'skipped', error: stage.skip });
          reportStatus({ current: index, message: stage.operation });
          continue;
        }

        reportStatus({ current: index - 1, total: stages.length, message: stage.operation });
        // `Effect.exit`, not `either`: an unavailable model or a provider HTTP error arrives as a
        // DEFECT (the AI layers `orDie`), which the error channel alone would let escape and fail
        // the whole cascade instead of being reported as one stage's outcome.
        const exit = yield* Effect.exit(stage.run);
        if (Exit.isSuccess(exit)) {
          results.push({ tier: stage.tier, operation: stage.operation, status: 'completed', output: exit.value });
        } else if (Cause.isInterruptedOnly(exit.cause)) {
          // Cancellation is not a stage failure — stop without marking the pipeline broken.
          results.push({ tier: stage.tier, operation: stage.operation, status: 'cancelled' });
          break;
        } else {
          const error = Cause.pretty(exit.cause).slice(0, 500);
          log.warn('enrich: stage failed', { operation: stage.operation, error });
          results.push({ tier: stage.tier, operation: stage.operation, status: 'failed', error });
          if (!continueOnError) {
            // Everything downstream consumes this stage's output; running it anyway would produce
            // results computed against a stale gate, which is worse than not running at all.
            for (const remaining of stages.slice(index)) {
              results.push({
                tier: remaining.tier,
                operation: remaining.operation,
                status: 'skipped',
                error: 'upstream stage failed',
              });
            }
            break;
          }
        }
        reportStatus({ current: index });
      }

      const completed = results.filter((result) => result.status === 'completed').length;
      const failed = results.filter((result) => result.status === 'failed').length;
      const skipped = results.filter((result) => result.status !== 'completed' && result.status !== 'failed').length;

      log.info('enrich: cascade done', { mailbox: Obj.getURI(mailbox), completed, failed, skipped });
      reportStatus({
        current: stages.length,
        message: signal.aborted
          ? PROGRESS_STATUS_CANCELLED
          : failed > 0
            ? PROGRESS_STATUS_FAILED
            : PROGRESS_STATUS_COMPLETE,
      });

      return { completed, failed, skipped, stages: results };
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
