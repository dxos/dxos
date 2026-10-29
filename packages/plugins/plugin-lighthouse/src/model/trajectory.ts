//
// Copyright 2026 DXOS.org
//

// A session's trajectory as a chat thread, as lighthouse's web UI (`web/src/trajectory.ts`) renders it:
//
//   input                -> the person's prompt (a vote's feedback prompt as one line naming the results)
//   decide               -> a run row per narration: the line the agent said, then its tool calls
//   act (per call)       -> the call's outcome on its row: ok or failed, how long, a glance at its output
//   extract (during act) -> the results the call put into the graph, as pills on the same row
//   report call          -> a `surface` block with the picks
//
// Message ids derive from the run and event, so re-deriving the thread on every new event updates rows in place.

import { EntityId } from '@dxos/keys';
import { type ContentBlock, Message } from '@dxos/types';

import { type Entity, type Pick, type Session, type TrajectoryEvent } from '../client/types.ts';
import { toImageRefs } from './images.ts';
import { isResult, kindOf, priceOf, titleOf, urlOf } from './results.ts';

/** The chip a failed or stopped session ends with; the view turns it into a continue message. */
export const RETRY = 'Retry';

/** Surface role of a run row: a narration, its tool calls, and the results they produced. */
export const RUN_ROLE = 'org.dxos.plugin.lighthouse.run';

/** Surface role of the agent's report: one compact card per pick. */
export const PICKS_ROLE = 'org.dxos.plugin.lighthouse.picks';

/** The images a person attached to an input: `{ b64 }` holding `{ run, images }` (blobs of the run). */
export const IMAGES_ROLE = 'org.dxos.plugin.lighthouse.images';

/** A result as a row under the call that found it. */
export type Pill = { id: string; title: string; url?: string; kind: string; detail?: string };

/** One tool call in a run row: what it was asked, whether it worked, how long it took, a glance at its output. */
export type RunCall = { tool: string; args: string; ok?: boolean; error?: string; ms?: number; output?: string };

/** A run row: a narration (when the agent said what it was doing), its tool calls, and the results they produced. */
export type RunData = { narration?: string; calls: RunCall[]; pills: Pill[]; total: number; followed: number };

export type PicksSurfaceData = { picks: Pick[]; gaps?: string };

const text = (value: string): ContentBlock.Text => ({ _tag: 'text', text: value });
const status = (statusText: string): ContentBlock.Status => ({ _tag: 'status', statusText });

const clip = (value: string, length: number) =>
  value.length > length ? `${value.slice(0, length)}\u2026 (${value.length - length} more characters)` : value;

const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

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
      value = JSON.parse(output.replace(/\u2026 \[cut:[\s\S]*$/, ''));
    } catch {
      return clip(output, 600) || 'failed';
    }
  }
  const error = asRecord(asRecord(value)?.error);
  if (error) {
    return [
      asString(error.code) && `${asString(error.code)}:`,
      asString(error.message),
      asString(error.hint) && `- ${asString(error.hint)}`,
    ]
      .filter(Boolean)
      .join(' ');
  }
  return clip(outputText(value), 600) || 'failed';
};

/** A user prompt as the thread shows it: the prompt tag's source is rendered raw, so markup characters are swapped. */
const promptText = (value: string) => value.replace(/&/g, '\uFF06').replace(/</g, '\uFF1C').replace(/>/g, '\uFF1E');

const FEEDBACK_PREFIX = 'Feedback on the results panel';

/** The results a vote's feedback prompt names, by its Liked and Disliked lists (one JSON entity per line). */
const feedbackText = (value: string): string | undefined => {
  if (!value.startsWith(FEEDBACK_PREFIX)) {
    return undefined;
  }
  const names: Record<'Liked' | 'Disliked', string[]> = { Liked: [], Disliked: [] };
  let list: 'Liked' | 'Disliked' | undefined;
  for (const line of value.split('\n')) {
    if (line.startsWith('Liked:') || line.startsWith('Disliked:')) {
      list = line.startsWith('Liked:') ? 'Liked' : 'Disliked';
      continue;
    }
    if (list && line.startsWith('- ')) {
      try {
        const entity = asRecord(JSON.parse(line.slice(2)));
        const name = asArray(asRecord(entity?.props)?.['schema:name'])[0];
        names[list].push(typeof name === 'string' ? name : (asString(entity?.id) ?? '?'));
      } catch {
        names[list].push(line.slice(2, 60));
      }
    }
  }
  const parts = [
    names.Liked.length && `\u{1F44D} ${names.Liked.join(', ')}`,
    names.Disliked.length && `\u{1F44E} ${names.Disliked.join(', ')}`,
  ].filter(Boolean);
  return `Votes: ${parts.join(' · ') || 'cleared'} - rebuild the ranking.`;
};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/**
 * Run rows travel inside the thread's markdown as a `<surface>` tag. Tool outputs are JSON full of escaped quotes;
 * base64 holds nothing the markdown or the XML parser can act on. UTF-8 safe both ways.
 */
export const encodeRuns = (runs: readonly RunData[] | Readonly<Record<string, unknown>>): string => {
  const bytes = new TextEncoder().encode(JSON.stringify(runs));
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
};

/** The JSON a {@link encodeRuns} payload holds (a list of run rows; one row from an older thread). */
export const decodeRuns = (b64: string): unknown =>
  JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b64), (char) => char.charCodeAt(0))));

/** An input's attached images as one surface block; the widget reads what lighthouse saw in each. */
const inputImages = (run: string, raw: unknown): ContentBlock.Any[] => {
  const images = toImageRefs(raw);
  return images.length
    ? [{ _tag: 'surface', role: IMAGES_ROLE, data: { b64: encodeRuns({ run, images }) } } as ContentBlock.Any]
    : [];
};

/** Keeps a run row's tag small: very long tags stop the thread's markdown parser. */
const RUN_BUDGET = 9_000;

const fitRun = (run: RunData): RunData => {
  let fitted = run;
  for (const outputChars of [300, 120, 0]) {
    fitted = {
      ...run,
      calls: run.calls.map(({ output, ...call }) =>
        output && outputChars ? { ...call, output: clip(output, outputChars) } : call,
      ),
    };
    if (JSON.stringify(fitted).length <= RUN_BUDGET) {
      return fitted;
    }
  }
  return { ...fitted, calls: fitted.calls.slice(-30), pills: fitted.pills.slice(0, 16) };
};

/** A call's arguments as `key=value` pairs on one line. */
const argsLine = (args: unknown): string =>
  clip(
    Object.entries(asRecord(args) ?? {})
      .filter(([, value]) => value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0))
      .map(([key, value]) => `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`)
      .join(' '),
    200,
  );

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
  /** The run row the latest calls belong to; its data is filled in as acts arrive, and fitted at flush. */
  row?: RunData;
  rows: RunData[];
  pending: Array<{ name: string; call: RunCall }>;
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

  const openRow = (current: Turn, narration?: string): RunData => {
    const row: RunData = { ...(narration ? { narration } : {}), calls: [], pills: [], total: 0, followed: 0 };
    current.row = row;
    current.rows.push(row);
    // A placeholder the flush replaces with the fitted row, so the block order is the order rows opened in.
    current.blocks.push({ _tag: 'surface', role: RUN_ROLE, data: { index: current.rows.length - 1 } });
    return row;
  };

  const flush = () => {
    if (!turn) {
      return;
    }
    const rows = turn.rows;
    // Consecutive run rows travel as ONE surface tag holding the list: a surface tag directly after another run
    // row's tag was sometimes not recognised by the thread's parser and showed as raw text.
    const blocks: ContentBlock.Any[] = [];
    let group: RunData[] | undefined;
    const close = () => {
      if (group) {
        blocks.push({ _tag: 'surface', role: RUN_ROLE, data: { b64: encodeRuns(group) } });
        group = undefined;
      }
    };
    for (const block of turn.blocks) {
      if (block._tag !== 'surface' || block.role !== RUN_ROLE) {
        close();
        blocks.push(block);
        continue;
      }
      const row = rows[Number(block.data?.index)];
      // A row with neither calls nor results (all its calls were the report) says nothing.
      if (row && (row.calls.length > 0 || row.total > 0)) {
        (group ??= []).push(fitRun(row));
      }
    }
    close();
    messages.push(
      Message.make({
        id: EntityId.deterministic(run, 'decide', turn.seq),
        created: turn.created,
        sender: { role: 'assistant', name: 'Lighthouse' },
        blocks,
      }),
    );
    turn = undefined;
  };

  /** What a call put into the graph: the entities its extractions wrote, each once per message, onto its row. */
  const addResults = (current: Turn, followed: boolean) => {
    const found = current.extracts.flatMap((seq) => bySeq.get(seq) ?? []);
    current.extracts = [];
    const unique = [...new Map(found.map((entity) => [entity.id, entity])).values()];
    const fresh = unique.filter((entity) => !current.shown.has(entity.id));
    for (const entity of fresh) {
      current.shown.add(entity.id);
    }
    const real = fresh.filter(isResult);
    const shown = real.length ? real : fresh.filter((entity) => entity.types.includes('lh:SearchResult'));
    if (shown.length === 0) {
      return;
    }
    const row = current.row ?? openRow(current);
    row.total += shown.length;
    if (followed) {
      row.followed += shown.length;
    }
    row.pills.push(...shown.slice(0, Math.max(0, 24 - row.pills.length)).map(toPill));
  };

  for (const event of events) {
    switch (event.kind) {
      case 'input': {
        flush();
        const prompt = asString(event.data.text) ?? '';
        messages.push(
          Message.make({
            id: EntityId.deterministic(run, 'input', event.seq),
            created: event.t,
            sender: { role: 'user', name: senderName(asString(event.data.from)) },
            blocks: [text(promptText(feedbackText(prompt) ?? prompt)), ...inputImages(run, event.data.images)],
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
        const said = asString(event.data.text)?.trim() ?? '';
        const report = calls.find((call) => call.tool === 'report');
        const tools = calls.filter((call) => call.tool !== 'report');
        // Every turn up to the person's next prompt joins one message.
        turn ??= {
          seq: event.seq,
          created: event.t,
          blocks: [],
          rows: [],
          pending: [],
          extracts: [],
          shown: new Set(),
        };
        if (event.data.error !== undefined) {
          turn.blocks.push(status(`Model error: ${String(event.data.error).slice(0, 300)}`));
        }
        if (said && !report && tools.length === 0) {
          // A final answer with no calls: kept short, and the next calls start a new row.
          turn.blocks.push(text(clip(said, 700)));
          turn.row = undefined;
        }
        if (tools.length) {
          // A turn that says what it is doing starts a new row under that line; one that does not joins the row before.
          const row =
            said && !report ? openRow(turn, clip(said.split('\n')[0] ?? said, 240)) : (turn.row ?? openRow(turn));
          for (const tool of tools) {
            const call: RunCall = { tool: tool.tool, args: argsLine(tool.args) };
            row.calls.push(call);
            turn.pending.push({ name: tool.tool, call });
          }
        }
        if (report) {
          const data: PicksSurfaceData = picksOf(report.args);
          turn.blocks.push({ _tag: 'surface', role: PICKS_ROLE, data });
          turn.row = undefined;
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
        // A search's automatic follow-up (opening its top results) has no call of its own: its results join the row.
        if (asRecord(event.data.args)?.followedFrom !== undefined) {
          addResults(turn, true);
          break;
        }
        const index = turn.pending.findIndex((pending) => pending.name === event.data.tool);
        if (index < 0) {
          break;
        }
        const [pending] = turn.pending.splice(index, 1);
        if (!pending) {
          break;
        }
        const { call } = pending;
        call.ok = event.data.ok !== false;
        const ms = asNumber(event.ms);
        if (ms !== undefined) {
          call.ms = ms;
        }
        if (event.data.ok === false) {
          call.error = errorText(event.data.output);
        } else if (event.data.output !== undefined) {
          call.output = clip(outputText(event.data.output), 600);
        }
        addResults(turn, false);
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
        blocks: [status('Working...')],
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
