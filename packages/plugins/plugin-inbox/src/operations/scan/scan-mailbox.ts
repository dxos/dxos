//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import * as Capability from '@dxos/app-framework/Capability';
import { PROGRESS_STATUS_CANCELLED, PROGRESS_STATUS_COMPLETE, PROGRESS_STATUS_FAILED } from '@dxos/app-toolkit';
import * as Cancellation from '@dxos/compute/Cancellation';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Obj } from '@dxos/echo';
import { log } from '@dxos/log';

import * as InboxCapabilities from '../../types/InboxCapabilities';
import * as InboxOperation from '../../types/InboxOperation';
import { unmetPrecondition } from '../precondition';
import * as Topology from '../topology';

/** Placeholder run for a stage that cannot be attempted; `skip` is what the loop reads. */
const NEVER: Effect.Effect<unknown, unknown, Operation.Service> = Effect.void;

/** One spawned pipeline: the tier it belongs to, and the invocation, held unevaluated until its turn. */
type Stage = {
  readonly tier: InboxOperation.MailboxTier;
  readonly processor: string;
  /** Reason the stage cannot run (reported as `skipped` rather than attempted). */
  readonly skip?: string;
  readonly run: Effect.Effect<unknown, unknown, Operation.Service>;
};

type StageResult = {
  readonly tier: InboxOperation.MailboxTier;
  readonly processor: string;
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
const handler = InboxOperation.ScanMailbox.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({
      mailbox: mailboxRef,
      me = [],
      tiers = InboxOperation.DEFAULT_SCAN_MAILBOX_TIERS,
      batchLimit,
      model,
      provider,
      strict,
      continueOnError = false,
    }) {
      const mailbox = yield* Database.load(mailboxRef);
      const signal = yield* Cancellation.signal;

      const traceWriter = yield* Trace.TraceService;
      const progressKey = InboxOperation.createScanProgressKey(mailbox);
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

      // Processors come from the capability, including plugin-inbox's own: one source, so there is no
      // second code path for the built-ins to drift from. `tiers` filters by cost class; the declared
      // `after` edges decide the order, so a caller asking for `['summarize', 'deterministic']` gets
      // the same run as `['deterministic', 'summarize']` rather than a cascade that summarizes against
      // contacts it has not extracted.
      const selected = new Set(tiers);
      const contributed = yield* Capability.getAll(InboxCapabilities.MailboxProcessor);
      const { ordered, excluded } = Topology.sort(contributed.filter((processor) => selected.has(processor.tier)));

      // The plan is built up front so the cascade is inspectable as data (and the progress total is
      // known before the first spawn). `Operation.invoke` returns a lazy Effect — nothing runs here.
      const options: InboxCapabilities.MailboxProcessorOptions = { me, batchLimit, model, provider, strict };
      const stages: Stage[] = [
        // A processor the topology could not place is reported, never dropped: silence here would look
        // exactly like a pass that ran and found nothing.
        ...excluded.map(({ node, reason }) => ({ tier: node.tier, processor: node.id, skip: reason, run: NEVER })),
        ...ordered.map((processor) => {
          const invocation = processor.createInvocation(mailbox, options);
          return 'skip' in invocation
            ? { tier: processor.tier, processor: processor.id, skip: invocation.skip, run: NEVER }
            : {
                tier: processor.tier,
                processor: processor.id,
                run: Operation.invoke(invocation.operation, invocation.input),
              };
        }),
      ];

      log.info('scan: cascade start', {
        mailbox: Obj.getURI(mailbox),
        tiers,
        stages: stages.map((stage) => stage.processor),
      });
      reportStatus({ current: 0, total: stages.length });

      const results: StageResult[] = [];
      let index = 0;
      for (const stage of stages) {
        index += 1;
        if (signal.aborted) {
          // Remaining stages are reported rather than dropped: a half-run cascade must be legible.
          results.push({ tier: stage.tier, processor: stage.processor, status: 'cancelled' });
          continue;
        }
        if (stage.skip) {
          results.push({ tier: stage.tier, processor: stage.processor, status: 'skipped', error: stage.skip });
          reportStatus({ current: index, message: stage.processor });
          continue;
        }

        reportStatus({ current: index - 1, total: stages.length, message: stage.processor });
        // `Effect.exit`, not `either`: an unavailable model or a provider HTTP error arrives as a
        // DEFECT (the AI layers `orDie`), which the error channel alone would let escape and fail
        // the whole cascade instead of being reported as one stage's outcome.
        const exit = yield* Effect.exit(stage.run);
        if (Exit.isSuccess(exit)) {
          results.push({ tier: stage.tier, processor: stage.processor, status: 'completed', output: exit.value });
        } else if (Cause.hasInterruptsOnly(exit.cause)) {
          // Cancellation is not a stage failure — stop without marking the pipeline broken.
          results.push({ tier: stage.tier, processor: stage.processor, status: 'cancelled' });
          break;
        } else {
          const unmet = unmetPrecondition(exit.cause);
          if (unmet !== undefined) {
            // Something the tier declared is not in this deployment — the assistant is not up, or no
            // plugin contributed a service it needs. A precondition rather than a fault: report the
            // tier as skipped and keep going. Every later tier missing the same thing skips itself the
            // same way, and the tiers that already ran stay valid — treating it as a failure instead
            // aborts the cascade and leaves the meter red for a mailbox nothing is wrong with.
            log.info('scan: stage skipped', { processor: stage.processor, error: unmet });
            results.push({ tier: stage.tier, processor: stage.processor, status: 'skipped', error: unmet });
            reportStatus({ current: index, message: stage.processor });
            continue;
          }

          const error = Cause.pretty(exit.cause).slice(0, 500);
          log.warn('scan: stage failed', { processor: stage.processor, error });
          results.push({ tier: stage.tier, processor: stage.processor, status: 'failed', error });
          if (!continueOnError) {
            // Everything downstream consumes this stage's output; running it anyway would produce
            // results computed against a stale gate, which is worse than not running at all.
            for (const remaining of stages.slice(index)) {
              results.push({
                tier: remaining.tier,
                processor: remaining.processor,
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

      log.info('scan: cascade done', { mailbox: Obj.getURI(mailbox), completed, failed, skipped });
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
