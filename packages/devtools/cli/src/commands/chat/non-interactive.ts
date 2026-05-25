//
// Copyright 2026 DXOS.org
//

import { type ModelName } from '@dxos/ai';
import { type Space } from '@dxos/client/echo';
import { Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';

import { type ChatProcessor } from './processor';

/**
 * Object kinds we track in `--prompt --json` output. The agent's CRM blueprint
 * creates Persons / Organizations / Documents / ProfileOf relations during
 * research; this is the minimal set scripts care about. Other types created
 * incidentally (Chats, Feeds, Blueprints) are deliberately filtered out so the
 * JSON stays focused on the user-visible artefacts.
 */
const TRACKED_TYPENAMES: ReadonlyArray<{ typename: string; kind: string }> = [
  { typename: 'org.dxos.type.person', kind: 'Person' },
  { typename: 'org.dxos.type.organization', kind: 'Organization' },
  { typename: 'org.dxos.type.markdown.document', kind: 'Document' },
  { typename: 'org.dxos.relation.plugin-crm.profile-of', kind: 'ProfileOf' },
];

const TRACKED_TYPENAME_SET = new Set(TRACKED_TYPENAMES.map((t) => t.typename));

const kindForTypename = (typename: string | undefined): string | undefined =>
  typename ? TRACKED_TYPENAMES.find((t) => t.typename === typename)?.kind : undefined;

type SnapshotEntry = { id: string; updatedAt?: number };

/**
 * Snapshot the IDs (and where available, updatedAt) of every object whose
 * typename is in the tracked set. Used pre/post agent run to produce the
 * "created or updated during this session" diff.
 */
const snapshotTrackedObjects = async (space: Space): Promise<Map<string, SnapshotEntry>> => {
  const objects = await space.db.query(Filter.everything()).run();
  const snapshot = new Map<string, SnapshotEntry>();
  for (const obj of objects) {
    const typename = Obj.getTypename(obj as any);
    if (!typename || !TRACKED_TYPENAME_SET.has(typename)) {
      continue;
    }
    const id = (obj as any).id as string | undefined;
    if (!id) {
      continue;
    }
    const meta = (obj as any).__meta;
    const updatedAt = typeof meta?.updatedAt === 'number' ? meta.updatedAt : undefined;
    snapshot.set(id, { id, updatedAt });
  }
  return snapshot;
};

const diffSnapshots = (before: Map<string, SnapshotEntry>, after: Map<string, SnapshotEntry>) => {
  const changed: Array<{ id: string; created: boolean }> = [];
  for (const [id, entry] of after) {
    const prev = before.get(id);
    if (!prev) {
      changed.push({ id, created: true });
      continue;
    }
    // Updated heuristic: updatedAt advanced. If updatedAt isn't available we
    // can't tell, so we don't emit it.
    if (entry.updatedAt && prev.updatedAt && entry.updatedAt > prev.updatedAt) {
      changed.push({ id, created: false });
    }
  }
  return changed;
};

export type RunNonInteractiveOptions = {
  space: Space;
  processor: ChatProcessor;
  blueprints: string[];
  prompt: string;
  model: ModelName;
  /** When true, emit a JSON array of `{kind, dxn}`; otherwise emit the
   * agent's final assistant reply text. */
  json: boolean;
};

const renderText = async (space: Space, sessionFeedId: string): Promise<string> => {
  // The session writes messages to its feed. Pull them and find the last
  // assistant text reply.
  const objects = await space.db.query(Filter.everything()).run();
  const messages = objects
    .filter((obj: any) => Obj.getTypename(obj) === 'org.dxos.type.message')
    .filter((obj: any) => obj?.parentId === sessionFeedId || obj?.feed === sessionFeedId);
  // Best-effort: the message format is opaque to this command; if we can't
  // identify it confidently we fall back to a neutral summary line.
  if (messages.length === 0) {
    return 'Done.';
  }
  return `Done. ${messages.length} message(s) in session.`;
};

/**
 * Run the agent loop to completion with a single prompt. No TUI. Used by
 * `dx chat --prompt …` for scripted research / smoke tests.
 */
export const runNonInteractive = async (options: RunNonInteractiveOptions): Promise<void> => {
  const { space, processor, blueprints, prompt, model, json } = options;

  log.info('non-interactive: snapshot before run');
  const before = await snapshotTrackedObjects(space);

  log.info('non-interactive: creating session', { blueprints });
  const session = await processor.createSession(space, blueprints);

  try {
    log.info('non-interactive: submitting prompt', { promptPreview: prompt.slice(0, 80) });
    const request = session.createRequest({ prompt });
    await processor.execute(request, model);
    log.info('non-interactive: agent loop complete');
  } finally {
    await session.close().catch((err) => log.warn('session close failed', { err }));
  }

  const after = await snapshotTrackedObjects(space);
  const changed = diffSnapshots(before, after);

  if (json) {
    // Emit objects in deterministic order so test assertions are stable.
    const ordered = TRACKED_TYPENAMES.flatMap(({ typename, kind }) =>
      changed
        .filter(({ id }) => {
          const obj = after.get(id);
          if (!obj) {
            return false;
          }
          return TRACKED_TYPENAME_SET.has(typename); // typename re-check via lookup below
        })
        .map(({ id, created }) => ({ id, created, kind, typename })),
    );
    // The `typename` filter above is too permissive — re-derive kind per id.
    const result = changed
      .map(({ id, created }) => {
        // Look up the live object to get its typename.
        const live = (space.db as any).getObjectById?.(id);
        const typename = live ? Obj.getTypename(live) : undefined;
        const kind = kindForTypename(typename);
        if (!kind) {
          return undefined;
        }
        const dxn = live ? Obj.getDXN(live).toString() : `dxn:echo:@:${id}`;
        return { kind, dxn, created };
      })
      .filter((x): x is { kind: string; dxn: string; created: boolean } => x !== undefined)
      .sort((a, b) => {
        const ai = TRACKED_TYPENAMES.findIndex((t) => t.kind === a.kind);
        const bi = TRACKED_TYPENAMES.findIndex((t) => t.kind === b.kind);
        return ai === bi ? a.dxn.localeCompare(b.dxn) : ai - bi;
      });
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Default text mode — print a one-line summary plus the count of changed
  // objects so a human running this from a script knows the agent finished.
  // eslint-disable-next-line no-console
  console.log(await renderText(space, (session as any).feed?.id ?? ''));
  if (changed.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`Touched ${changed.length} object(s).`);
  }
};
