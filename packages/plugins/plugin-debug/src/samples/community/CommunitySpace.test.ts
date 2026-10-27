//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as ProjectMailboxOperation from '@dxos/plugin-projects/ProjectMailboxOperation';

import * as CommunitySpace from './CommunitySpace.ts';
import { MESSAGES, SCRIPT, answer } from './triage-script.ts';

const countOf = (counts: Record<string, number>, typename: string) =>
  Object.entries(counts)
    .filter(([type]) => type.includes(typename))
    .reduce((total, [, count]) => total + count, 0);

describe('Community support template', () => {
  test('builds the channel, its messages, the project and its routine', { timeout: 120_000 }, async ({ expect }) => {
    const { json } = await EffectEx.runPromise(buildArchive(CommunitySpace.make()));
    const counts = histogram(json);

    expect(countOf(counts, 'type.channel')).toBe(1);
    expect(countOf(counts, 'type.message')).toBe(8);
    expect(countOf(counts, 'type.project')).toBe(1);
    expect(countOf(counts, 'type.routine')).toBe(1);
    expect(countOf(counts, 'type.trigger')).toBe(1);
  });

  test('the trigger is a disabled feed trigger on the channel that runs TriageMessages', async ({ expect }) => {
    const { json } = await EffectEx.runPromise(buildArchive(CommunitySpace.make()));
    // The archive embeds the objects as a JSON string, so its quotes arrive escaped.
    const text = JSON.stringify(json).replaceAll('\\"', '"');
    const trigger = text.match(
      /"@type":"dxn:org\.dxos\.type\.trigger:[^"]*".*?"spec":\{"feed":\{"\/":"([^"]+)"\},"kind":"feed"\}/,
    )?.[0];
    expect(trigger).toBeDefined();
    expect(trigger).toContain('"enabled":false');
    expect(trigger).toContain(`"runnable":{"/":"${ProjectMailboxOperation.TriageMessages.meta.key}"}`);
    // The trigger watches the same feed it hands the operation.
    const [, watched] = trigger?.match(/"spec":\{"feed":\{"\/":"([^"]+)"/) ?? [];
    expect(trigger).toContain(`"input":{"feed":{"/":"${watched}"}`);
  });

  test('every schema the content persists is declared', { timeout: 120_000 }, async ({ expect }) => {
    const { json } = await EffectEx.runPromise(buildArchive(CommunitySpace.make()));
    const declared = new Set(CommunitySpace.make().schemas.map((schema) => Type.getTypename(schema)));
    for (const type of Object.keys(histogram(json))) {
      const typename = type.match(/(?:[\w-]+\.)+type\.[\w.]+/)?.[0];
      if (typename && typename !== 'org.dxos.type.spaceProperties') {
        expect(declared).toContain(typename);
      }
    }
  });

  test('each message matches at most one script entry, and the script files 3 replies and 6 tasks', ({ expect }) => {
    for (const { text } of MESSAGES) {
      expect(SCRIPT.filter((entry) => text.includes(entry.match)).length).toBeLessThanOrEqual(1);
    }
    const results = MESSAGES.map(({ text }) => answer(text));
    expect(results.filter((result) => result.reply).length).toBe(3);
    expect(results.reduce((total, result) => total + result.tasks.length, 0)).toBe(6);
  });
});
