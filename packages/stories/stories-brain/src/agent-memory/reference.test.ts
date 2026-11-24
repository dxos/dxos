//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SESSIONS } from './fixtures.ts';
import { ReferenceNamespace } from './reference.ts';

const setup = async () => {
  const namespace = new ReferenceNamespace('ns_demo', { seed: 7, now: () => new Date('2026-11-17T00:00:00Z') });
  const profile = await namespace.getProfile('dana');
  return { namespace, profile };
};

describe('ReferenceProfile', () => {
  test('ingest only enqueues; drain extracts and classifies', async ({ expect }) => {
    const { profile } = await setup();
    await profile.ingest(SESSIONS[0].messages, { sessionId: SESSIONS[0].id });
    expect(profile.pending).toBe(1);
    expect((await profile.list()).memories).toHaveLength(0);

    const [trace] = profile.drain();
    expect(trace.messages.stored).toHaveLength(6);
    expect(trace.decisions.map(({ item }) => item.type)).toEqual([
      'fact',
      'fact',
      'fact',
      'event',
      'instruction',
      'task',
    ]);
    const { memories } = await profile.list();
    expect(memories).toHaveLength(6);
    expect(memories[0].id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  test('re-ingesting a session is idempotent', async ({ expect }) => {
    const { profile } = await setup();
    await profile.ingest(SESSIONS[0].messages, { sessionId: SESSIONS[0].id });
    profile.drain();
    await profile.ingest(SESSIONS[0].messages, { sessionId: SESSIONS[0].id });
    const [trace] = profile.drain();
    expect(trace.messages.skipped).toBe(6);
    expect(trace.decisions).toHaveLength(0);
    expect((await profile.list()).memories).toHaveLength(6);
  });

  test('a fact with the same topic key supersedes; events accumulate', async ({ expect }) => {
    const { profile } = await setup();
    for (const session of SESSIONS) {
      await profile.ingest(session.messages, { sessionId: session.id });
    }
    const [, second] = profile.drain();
    expect(second.decisions.map(({ decision }) => decision)).toEqual(['supersede', 'insert', 'insert']);

    const { memories } = profile.tables();
    const preferences = memories.filter((row) => row.topicKey === 'preference.backend-service');
    expect(preferences).toHaveLength(2);
    expect(preferences[0].supersededBy).toBe(preferences[1].id);

    const active = (await profile.list()).memories;
    expect(active.some((entry) => entry.summary.includes('TypeScript'))).toBe(false);
    expect(active.filter((entry) => entry.type === 'event')).toHaveLength(2);
  });

  test('recall fuses retrievers and answers from the latest version', async ({ expect }) => {
    const { profile } = await setup();
    for (const session of SESSIONS) {
      await profile.ingest(session.messages, { sessionId: session.id });
    }
    profile.drain();

    const preference = await profile.recall('Which language does Dana use for backend services?', {
      responseLength: 'short',
    });
    expect(preference.answer).toContain('Rust');
    expect(preference.answer).not.toContain('TypeScript');

    const events = await profile.recall('What happened with the ledger service?', {
      referenceDate: '2026-11-17',
    });
    expect(events.answer).toContain('Rolled back');
    expect(events.answer).toContain('day ago');

    const none = await profile.recall('What is the capital of France?');
    expect(none).toEqual({ count: 0, answer: '', candidates: [] });
  });

  test('deleteSession soft-deletes the rows tagged with it', async ({ expect }) => {
    const { profile } = await setup();
    for (const session of SESSIONS) {
      await profile.ingest(session.messages, { sessionId: session.id });
    }
    profile.drain();
    await profile.deleteSession(SESSIONS[1].id);
    const { memories } = await profile.list();
    expect(memories.every((entry) => entry.sessionId === SESSIONS[0].id)).toBe(true);
    expect(profile.tables().memories.filter((row) => row.deletedAt)).toHaveLength(3);
  });

  test('summary is structured Markdown', async ({ expect }) => {
    const { profile } = await setup();
    await profile.ingest(SESSIONS[0].messages, { sessionId: SESSIONS[0].id });
    profile.drain();
    const { summary } = await profile.getSummary();
    expect(summary).toMatch(/^## Summary/);
    expect(summary).toContain('### Open tasks');
    expect(summary).toContain('### Last Session (chat-2026-11-10)');
  });
});
