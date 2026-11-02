//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useEffect, useState } from 'react';

import * as EffectEx from '@dxos/effect/EffectEx';

import { type Entity, type Extension, type LighthouseClient, type Session } from '#client';

/** The node an extension writes for a subject: `<subject>#ext-<id>`. */
export const extensionNodeId = (subject: string, extension: string) => `${subject}#ext-${extension}`;

/**
 * The extension nodes already read for a subject, by extension id. Read one by one from the graph, since a session's
 * results leave extension nodes out; `version` re-reads them (after a quick read lands).
 */
export const useExtensionNodes = (
  client: LighthouseClient | undefined,
  subject: string | undefined,
  extensions: readonly Extension[],
  version = 0,
): Record<string, Entity> => {
  const [nodes, setNodes] = useState<Record<string, Entity>>({});
  const key = extensions.map((extension) => extension.id).join(',');
  useEffect(() => {
    setNodes({});
    if (!client || !subject || extensions.length === 0) {
      return;
    }
    let live = true;
    const read = Effect.forEach(
      extensions,
      (extension) =>
        client.getEntity(extensionNodeId(subject, extension.id)).pipe(
          Effect.map((node) => (node ? [[extension.id, node] as const] : [])),
          Effect.orElseSucceed(() => []),
        ),
      { concurrency: 4 },
    );
    void EffectEx.runPromise(read).then((entries) => {
      if (live) {
        setNodes(Object.fromEntries(entries.flat()));
      }
    });
    return () => {
      live = false;
    };
    // `key` stands for the extensions, whose array identity changes on every render.
  }, [client, subject, key, version]);
  return nodes;
};

/** A deep extension's research session for a subject, with the items it collected. */
export type ChildResearch = { session: Session; items: Entity[] };

/**
 * The deep research sessions for a subject, by extension id: the sessions whose parent names this subject and
 * extension, and any run a deep extend just started (`runs`). Each with the items of the extension's class it found.
 */
export const useChildResearch = (
  client: LighthouseClient | undefined,
  subject: string | undefined,
  extensions: readonly Extension[],
  runs: Readonly<Record<string, string>> = {},
): Record<string, ChildResearch> => {
  const [research, setResearch] = useState<Record<string, ChildResearch>>({});
  const deep = extensions.filter((extension) => extension.research);
  const key = `${deep.map((extension) => extension.id).join(',')}|${Object.entries(runs).join(',')}`;
  useEffect(() => {
    setResearch({});
    if (!client || !subject || deep.length === 0) {
      return;
    }
    let live = true;
    const read = Effect.gen(function* () {
      const sessions = yield* client.listSessions().pipe(Effect.orElseSucceed((): Session[] => []));
      return yield* Effect.forEach(
        deep,
        (extension) =>
          Effect.gen(function* () {
            const started = runs[extension.id];
            // The newest session reading this extension for this subject.
            const found = sessions
              .filter((session) => session.parent?.subject === subject && session.parent?.extension === extension.id)
              .sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''))[0];
            const session =
              started && started !== found?.run
                ? yield* client.getSession(started).pipe(Effect.orElseSucceed(() => undefined))
                : found;
            if (!session) {
              return [];
            }
            const results = yield* client.listResults(session.run).pipe(Effect.orElseSucceed((): Entity[] => []));
            const itemClass = extension.research?.class;
            const items = itemClass ? results.filter((entity) => entity.types.includes(itemClass)) : results;
            return [[extension.id, { session, items }] as const];
          }),
        { concurrency: 2 },
      );
    });
    void EffectEx.runPromise(read).then((entries) => {
      if (live) {
        setResearch(Object.fromEntries(entries.flat()));
      }
    });
    return () => {
      live = false;
    };
    // `key` stands for the deep extensions and the started runs, whose identities change on every render.
  }, [client, subject, key]);
  return research;
};
