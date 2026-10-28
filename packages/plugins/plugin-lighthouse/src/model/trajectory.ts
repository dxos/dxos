//
// Copyright 2026 DXOS.org
//

// A session's trajectory as a chat thread, as lighthouse's web UI (`web/src/trajectory.ts`) renders it:
//
//   input                → the person's prompt
//   decide               → an assistant message: its narration as a status line, a toolCall block per call
//   act (per call)       → the call's toolResult (the output the model saw)
//   extract (during act) → a `surface` block listing what the call put into the graph, as pills
//   report call          → a `surface` block with the picks
//
// Message ids derive from the run and event, so re-deriving the thread on every new event updates rows in place.

import { EntityId } from '@dxos/keys';
import { type ContentBlock, Message } from '@dxos/types';

import { type Entity, type Pick, type Session, type TrajectoryEvent } from '../client/types.ts';
import { isResult, kindOf, priceOf, titleOf, urlOf } from './results.ts';

/** The chip a failed or stopped session ends with; the view turns it into a continue message. */
export const RETRY = 'Retry';

/** Surface role of the pills a tool call put into the graph. */
export const RESULTS_ROLE = 'org.dxos.plugin.lighthouse.results';

/** Surface role of the agent's report: one compact card per pick. */
export const PICKS_ROLE = 'org.dxos.plugin.lighthouse.picks';

/** A result as a row under the call that found it. */
export type Pill = { id: string; title: string; url?: string; kind: string; detail?: string };

export type ResultsSurfaceData = { total: number; pills: Pill[]; followed?: boolean };

export type PicksSurfaceData = { picks: Pick[]; gaps?: string };

const text = (value: string): ContentBlock.Text => ({ _tag: 'text', text: value });
const status = (statusText: string): ContentBlock.Status => ({ _tag: 'status', statusText });

const clip = (value: string, length: number) =>
  value.length > length ? `${value.slice(0, length)}… (${value.length - length} more characters)` : value;

const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : undefined;

const outputText = (output: unknown): string =>
  typeof output === 'string' ? output : output === undefined ? '' : JSON.stringify(output, null, 1);

/** A failed call's error as the command reported it: code, message and hint, else the start of its output. */
const errorText = (output: unknown): string => {
  let value: unknown = output;
  if (typeof output === 'string') {
    try {
      value = JSON.parse(output.replace(/… \[cut:[\s\S]*$/, ''));
    } catch {
      return clip(output, 600) || 'failed';
    }
  }
  const error = asRecord(asRecord(value)?.error);
  if (error) {
    return [
      asString(error.code) && `${asString(error.code)}:`,
      asString(error.message),
      asString(error.hint) && `— ${asString(error.hint)}`,
    ]
      .filter(Boolean)
      .join(' ');
  }
  return clip(outputText(value), 600) || 'failed';
};

/** A user prompt as the thread shows it: the prompt tag's source is rendered raw, so markup characters are swapped. */
const promptText = (value: string) => value.replace(/&/g, '＆').replace(/</g, '＜').replace(/>/g, '＞');

const toPill = (entity: Entity): Pill => {
  const { price } = priceOf(entity);
  const rank = entity.props['lh:rank']?.[0];
  return {
    id: entity.id,
    title: titleOf(entity),
    url: urlOf(entity),
    kind: entity.types.includes('lh:SearchResult') ? `#${rank ?? '?'}` : kindOf(entity),
    ...(price ? { detail: price } : {}),
  };
};

type Call = { tool: string; args: unknown };

const callsOf = (data: Record<string, unknown>): Call[] =>
  Array.isArray(data.calls)
    ? data.calls.flatMap((call): Call[] => {
        const record = asRecord(call);
        const tool = asString(record?.tool);
        return tool ? [{ tool, args: record?.args }] : [];
      })
    : [];

const picksOf = (args: unknown): PicksSurfaceData => {
  const report = asRecord(args);
  const findings = Array.isArray(report?.findings) ? report.findings : [];
  const picks = findings.slice(0, 24).flatMap((finding): Pick[] => {
    const record = asRecord(finding);
    const title = asString(record?.title);
    if (!title) {
      return [];
    }
    const url = asString(record?.url);
    return [{ title, why: clip(asString(record?.why) ?? '', 220), ...(url ? { url } : {}) }];
  });
  const gaps = asString(report?.gaps);
  return { picks, ...(gaps ? { gaps: clip(gaps, 300) } : {}) };
};

type Turn = {
  seq: number;
  created?: string;
  blocks: ContentBlock.Any[];
  pending: Array<{ id: string; name: string }>;
  extracts: number[];
  shown: Set<string>;
};

/** Who sent a prompt, from the client that wrote it (`from` on the input event). */
const senderName = (from: string | undefined) => {
  switch (from) {
    case 'composer':
      return 'You';
    case 'web':
      return 'You (web)';
    case 'mcp':
      return 'An agent (MCP)';
    default:
      return 'You (CLI)';
  }
};

/** The session's trajectory as `@dxos/types` messages for the assistant ChatThread. */
export const toMessages = (
  session: Session | undefined,
  events: readonly TrajectoryEvent[],
  results: readonly Entity[],
): Message.Message[] => {
  if (!session) {
    return [];
  }

  const run = session.run;
  const bySeq = new Map<number, Entity[]>();
  for (const entity of results) {
    for (const seq of entity.seen ?? []) {
      bySeq.set(seq, [...(bySeq.get(seq) ?? []), entity]);
    }
  }

  const messages: Message.Message[] = [];
  let turn: Turn | undefined;

  const flush = () => {
    if (!turn) {
      return;
    }
    messages.push(
      Message.make({
        id: EntityId.deterministic(run, 'decide', turn.seq),
        created: turn.created,
        sender: { role: 'assistant', name: 'Lighthouse' },
        blocks: turn.blocks,
      }),
    );
    turn = undefined;
  };

  /** What a call put into the graph: the entities its extractions wrote, each once per answer. */
  const pushPills = (current: Turn, followed: boolean) => {
    const found = current.extracts.flatMap((seq) => bySeq.get(seq) ?? []);
    current.extracts = [];
    const unique = [...new Map(found.map((entity) => [entity.id, entity])).values()];
    const fresh = unique.filter((entity) => !current.shown.has(entity.id));
    for (const entity of fresh) {
      current.shown.add(entity.id);
    }
    const real = fresh.filter(isResult);
    const shown = real.length ? real : fresh.filter((entity) => entity.types.includes('lh:SearchResult'));
    if (shown.length) {
      const data: ResultsSurfaceData = {
        total: shown.length,
        pills: shown.slice(0, 24).map(toPill),
        ...(followed ? { followed: true } : {}),
      };
      current.blocks.push({ _tag: 'surface', role: RESULTS_ROLE, data });
    }
  };

  for (const event of events) {
    switch (event.kind) {
      case 'input': {
        flush();
        messages.push(
          Message.make({
            id: EntityId.deterministic(run, 'input', event.seq),
            created: event.t,
            sender: { role: 'user', name: senderName(asString(event.data.from)) },
            blocks: [text(promptText(asString(event.data.text) ?? ''))],
          }),
        );
        break;
      }

      case 'decide': {
        // Model calls inside tools log decide events too; only the agent's own turns carry a stopReason.
        if (!('stopReason' in event.data)) {
          break;
        }
        const calls = callsOf(event.data);
        const blocks: ContentBlock.Any[] = [];
        const said = asString(event.data.text)?.trim() ?? '';
        const report = calls.find((call) => call.tool === 'report');
        // The report speaks for itself (as pick cards); its accompanying prose is dropped.
        if (said && !report) {
          blocks.push(calls.length ? status(clip(said.split('\n')[0] ?? said, 240)) : text(clip(said, 700)));
        }
        if (event.data.error !== undefined) {
          blocks.push(status(`Model error: ${String(event.data.error).slice(0, 300)}`));
        }
        const pending = calls.map((call, index) => ({ id: `${event.seq}-${index}`, name: call.tool }));
        calls.forEach((call, index) => {
          if (call.tool !== 'report') {
            blocks.push({
              _tag: 'toolCall',
              toolCallId: `${event.seq}-${index}`,
              name: call.tool,
              input: clip(JSON.stringify(call.args ?? {}), 1_500),
              providerExecuted: false,
            });
          }
        });
        if (report) {
          const data: PicksSurfaceData = picksOf(report.args);
          blocks.push({ _tag: 'surface', role: PICKS_ROLE, data });
        }
        // Every turn up to the person's next prompt joins one message, so the thread folds them into one tool panel.
        if (turn) {
          turn.blocks.push(...blocks);
          turn.pending.push(...pending);
        } else {
          turn = { seq: event.seq, created: event.t, blocks, pending, extracts: [], shown: new Set() };
        }
        break;
      }

      case 'extract': {
        turn?.extracts.push(event.seq);
        break;
      }

      case 'act': {
        if (!turn) {
          break;
        }
        const args = asRecord(event.data.args);
        // A search's automatic follow-up (opening its top results) has no call of its own: it joins the search's.
        if (args?.followedFrom !== undefined) {
          pushPills(turn, true);
          break;
        }
        const index = turn.pending.findIndex((pending) => pending.name === event.data.tool);
        if (index < 0) {
          break;
        }
        const [call] = turn.pending.splice(index, 1);
        if (!call || call.name === 'report') {
          break;
        }
        turn.blocks.push({
          _tag: 'toolResult',
          toolCallId: call.id,
          name: call.name,
          // Kept short: the panel is for glancing, and very long tags stop the thread's markdown parser.
          result: clip(outputText(event.data.output), 1_500),
          ...(event.data.ok === false ? { error: errorText(event.data.output) } : {}),
          providerExecuted: false,
        });
        pushPills(turn, false);
        break;
      }
    }
  }
  flush();

  if (session.busy) {
    messages.push(
      Message.make({
        id: EntityId.deterministic(run, 'working'),
        sender: { role: 'assistant', name: 'Lighthouse' },
        blocks: [status('Working…')],
      }),
    );
  } else if (session.status === 'failed' || session.status === 'stopped') {
    messages.push(
      Message.make({
        id: EntityId.deterministic(run, 'end', session.status),
        sender: { role: 'assistant', name: 'Lighthouse' },
        blocks: [
          text(`_Session ${session.status}${session.reason ? `: ${session.reason}` : ''}._`),
          // A suggestion chip: clicking it submits its text, which the view sends as a follow-up.
          { _tag: 'suggestion', text: RETRY },
        ],
      }),
    );
  }
  return messages;
};
