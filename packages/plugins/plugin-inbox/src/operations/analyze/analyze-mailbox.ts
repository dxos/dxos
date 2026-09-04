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

/** Placeholder run for a pass that cannot be attempted; `skip` is what the loop reads. */
const NEVER: Effect.Effect<unknown, unknown, Operation.Service> = Effect.void;

/** One spawned pipeline: the tier it belongs to, and the invocation, held unevaluated until its turn. */
type Pass = {
  readonly tier: InboxOperation.MailboxTier;
  readonly processor: string;
  /** URI of what this run is about, when the processor covers more than the mailbox itself. */
  readonly subject?: string;
  /** Reason the pass cannot run (reported as `skipped` rather than attempted). */
  readonly skip?: string;
  readonly run: Effect.Effect<unknown, unknown, Operation.Service>;
};

type PassResult = {
  readonly tier: InboxOperation.MailboxTier;
  readonly processor: string;
  /** URI of what this run was about; several results share a processor when it covers N subjects. */
  readonly subject?: string;
  readonly status: 'completed' | 'failed' | 'skipped' | 'cancelled';
  readonly output?: unknown;
  readonly error?: string;
};

/**
 * Runs the mailbox pipelines as a cascade, each tier's output gating the next: deterministic
 * extraction (contacts + subscriptions) → cheap LLM classification → optional per-message analysis.
 *
 * Sequencing is the whole point. Classification consults the Person objects the contact pass
 * creates — a known sender is tagged personal, never spam, and never sent to the model — so running
 * the tiers out of order (or classifying a mailbox whose contacts were never extracted) silently
 * pays full price for a weaker verdict. Ordering the spawns here also makes the cursor watermark
 * hold by construction: no tier can advance past one that has not yet seen the same messages.
 *
 * Each spawned operation keeps its own cursor, batch cap, idempotency and services, so this handler
 * adds no pipeline logic — it decides what runs, in what order, and what to do when a pass fails.
 * A failure invalidates only that processor's DESCENDANTS in the topology; independent branches run.
 */
const handler = InboxOperation.AnalyzeMailbox.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({
      mailbox: mailboxRef,
      me = [],
      tiers = InboxOperation.DEFAULT_ANALYZE_MAILBOX_TIERS,
      batchLimit,
      model,
      provider,
      strict,
      continueOnError = false,
    }) {
      const mailbox = yield* Database.load(mailboxRef);
      const signal = yield* Cancellation.signal;

      const traceWriter = yield* Trace.TraceService;
      const progressKey = InboxOperation.createAnalyzeProgressKey(mailbox);
      // Both counters are held across updates: a meter reads the LATEST status, so emitting an
      // undefined total on a current-only tick would blank the denominator mid-cascade.
      let current = 0;
      let total: number | undefined;
      // Phase first — see the matching note in `mail-sync.ts`. The running processor is not appended:
      // the meter's own `current/total` already says how far through the cascade the run is.
      const analyzeLabel = `Analyzing ${mailbox.name ?? 'mailbox'}`;
      const reportStatus = (patch: { message?: string; current?: number; total?: number } = {}) => {
        current = patch.current ?? current;
        total = patch.total ?? total;
        traceWriter.write(Trace.StatusUpdate, {
          message: analyzeLabel,
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
      const passes: Pass[] = [
        // A processor the topology could not place is reported, never dropped: silence here would look
        // exactly like a pass that ran and found nothing.
        ...excluded.map(({ node, reason }) => ({ tier: node.tier, processor: node.id, skip: reason, run: NEVER })),
        // `flatMap`, because a processor may cover several subjects — one Project's view of a shared
        // feed, say — and each is a separately-cursored run. They keep the contributing processor's
        // id so the `after` edges and the failure blocking below still speak in processor terms; only
        // the reported subject differs.
        ...ordered.flatMap((processor): Pass[] => {
          const invocations = processor.createInvocations(mailbox, options);
          if ('skip' in invocations) {
            return [{ tier: processor.tier, processor: processor.id, skip: invocations.skip, run: NEVER }];
          }
          // An empty list is a processor that found nothing to run — reported, not silently absent.
          if (invocations.length === 0) {
            return [{ tier: processor.tier, processor: processor.id, skip: 'no subjects', run: NEVER }];
          }
          return invocations.map(({ subject, operation, input }) => ({
            tier: processor.tier,
            processor: processor.id,
            subject: subject ? Obj.getURI(subject) : undefined,
            run: Operation.invoke(operation, input),
          }));
        }),
      ];

      log.info('analyze: cascade start', {
        mailbox: Obj.getURI(mailbox),
        tiers,
        passes: passes.map((pass) => pass.processor),
      });
      reportStatus({ current: 0, total: passes.length });

      /** Identity every result carries, kept in one place so no branch can report half of it. */
      const passId = (pass: Pass) => ({ tier: pass.tier, processor: pass.processor, subject: pass.subject });

      const results: PassResult[] = [];
      /** Processors invalidated by an upstream failure, and why. */
      const blocked = new Map<string, string>();
      let index = 0;
      for (const pass of passes) {
        index += 1;
        const blockedReason = blocked.get(pass.processor);
        if (blockedReason) {
          results.push({ ...passId(pass), status: 'skipped', error: blockedReason });
          reportStatus({ current: index, message: pass.processor });
          continue;
        }
        if (signal.aborted) {
          // Remaining passes are reported rather than dropped: a half-run cascade must be legible.
          results.push({ ...passId(pass), status: 'cancelled' });
          continue;
        }
        if (pass.skip) {
          results.push({ ...passId(pass), status: 'skipped', error: pass.skip });
          reportStatus({ current: index, message: pass.processor });
          continue;
        }

        reportStatus({ current: index - 1, total: passes.length, message: pass.processor });
        // `Effect.exit`, not `either`: an unavailable model or a provider HTTP error arrives as a
        // DEFECT (the AI layers `orDie`), which the error channel alone would let escape and fail
        // the whole cascade instead of being reported as one pass's outcome.
        const exit = yield* Effect.exit(pass.run);
        if (Exit.isSuccess(exit)) {
          results.push({ ...passId(pass), status: 'completed', output: exit.value });
        } else if (Cause.hasInterruptsOnly(exit.cause)) {
          // Cancellation is not a pass failure — stop without marking the pipeline broken. Everything
          // planned behind it is reported too: a half-run cascade whose tail is simply ABSENT reads as
          // a cascade that was never planned that way, which is the same illegibility the excluded and
          // pre-run-cancelled paths already avoid.
          results.push({ ...passId(pass), status: 'cancelled' });
          for (const remaining of passes.slice(index)) {
            results.push({ ...passId(remaining), status: 'cancelled' });
          }
          break;
        } else {
          const unmet = unmetPrecondition(exit.cause);
          if (unmet !== undefined) {
            // Something the tier declared is not in this deployment — the assistant is not up, or no
            // plugin contributed a service it needs. A precondition rather than a fault: report the
            // tier as skipped and keep going. Every later tier missing the same thing skips itself the
            // same way, and the tiers that already ran stay valid — treating it as a failure instead
            // aborts the cascade and leaves the meter red for a mailbox nothing is wrong with.
            log.info('analyze: pass skipped', { processor: pass.processor, error: unmet });
            results.push({ ...passId(pass), status: 'skipped', error: unmet });
            reportStatus({ current: index, message: pass.processor });
            continue;
          }

          const error = Cause.pretty(exit.cause).slice(0, 500);
          log.warn('analyze: pass failed', { processor: pass.processor, error });
          results.push({ ...passId(pass), status: 'failed', error });
          if (!continueOnError) {
            // Only what actually consumed this output is invalidated. Blocking by run POSITION instead
            // would strand processors that never depended on it — `subscriptions` declares no edge to
            // `classify`, so a classification failure has no bearing on it.
            for (const id of Topology.descendants(ordered, pass.processor)) {
              blocked.set(id, `upstream '${pass.processor}' failed`);
            }
          }
        }
        reportStatus({ current: index });
      }

      // Counted by their own status rather than by exclusion: `skipped` used to mean "not completed
      // and not failed", which swept up cancellations — so an interrupted run reported its entire
      // unrun tail as skipped, a pass having decided not to run rather than never reaching the line.
      const countOf = (status: PassResult['status']) => results.filter((result) => result.status === status).length;
      const completed = countOf('completed');
      const failed = countOf('failed');
      const skipped = countOf('skipped');
      const cancelled = countOf('cancelled');

      log.info('analyze: cascade done', { mailbox: Obj.getURI(mailbox), completed, failed, skipped, cancelled });
      reportStatus({
        current: passes.length,
        message: signal.aborted
          ? PROGRESS_STATUS_CANCELLED
          : failed > 0
            ? PROGRESS_STATUS_FAILED
            : PROGRESS_STATUS_COMPLETE,
      });

      return { completed, failed, skipped, cancelled, stages: results };
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
