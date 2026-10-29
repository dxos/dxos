//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { toRating, toRatingModel, toSession, toUpdate } from './decode.ts';
import { type SseMessage, createSseParser } from './sse.ts';

describe('createSseParser', () => {
  test('frames split across chunks, comments, multi-line data and ids', ({ expect }) => {
    const messages: SseMessage[] = [];
    const parser = createSseParser((message) => messages.push(message));
    parser.push(': ping\n\nid: 4\nevent: ev');
    parser.push('ent\ndata: {"seq":4,\ndata: "kind":"input"}\n\n');
    parser.push('event: heartbeat\r\ndata: {}\r\n\r\n');
    expect(messages).toEqual([
      { event: 'event', data: '{"seq":4,\n"kind":"input"}', id: '4' },
      { event: 'heartbeat', data: '{}', id: '4' },
    ]);
    expect(parser.lastEventId).toBe('4');
  });
});

describe('decode', () => {
  test('a /v1 snapshot: session, events, paged results and nested rating', ({ expect }) => {
    const update = toUpdate('snapshot', {
      session: {
        run: 'r1',
        goal: 'g',
        status: 'running',
        budget: { minutes: 5, usd: 0.2, pages: 15 },
        spent: { seconds: 10, usd: 0.01, pages: 2 },
        model: 'p/m',
        report: { picks: [{ title: 'A', why: 'w', subject: 'urn:a' }] },
      },
      events: [{ seq: 1, t: 't', kind: 'input', data: { text: 'hi' } }, { nope: true }],
      results: {
        total: 1,
        items: [{ id: 'urn:a', types: ['schema:Thing'], props: { 'schema:name': ['A', null] }, seen: [1] }],
      },
      rating: {
        model: {
          version: 1,
          rationale: '',
          terms: [{ id: 't', label: 'T', weight: 1, value: { prop: 'x' }, shape: 'higher' }],
        },
        feedback: { 'urn:a': 'up' },
      },
    });
    expect(update?.type).toBe('snapshot');
    if (update?.type !== 'snapshot') {
      return;
    }
    expect(update.snapshot.session).toMatchObject({ run: 'r1', busy: true, budget: { minutes: 5 }, model: 'p/m' });
    expect(update.snapshot.session?.report?.picks).toEqual([{ title: 'A', why: 'w', subject: 'urn:a' }]);
    expect(update.snapshot.events).toHaveLength(1);
    expect(update.snapshot.results).toEqual([
      { id: 'urn:a', types: ['schema:Thing'], props: { 'schema:name': ['A'] }, seen: [1] },
    ]);
    expect(update.snapshot.rating.model?.version).toBe(1);
    expect(update.snapshot.rating.feedback).toEqual({ 'urn:a': 'up' });
  });

  test('a single event, a heartbeat, and a malformed rating model', ({ expect }) => {
    expect(toUpdate('event', { seq: 2, t: '', kind: 'act', data: {} })).toEqual({
      type: 'events',
      events: [{ seq: 2, t: '', kind: 'act', data: {} }],
    });
    expect(toUpdate('heartbeat', {})).toBeUndefined();
    expect(toRating({ model: { terms: [{ id: 1 }] }, feedback: { a: 'sideways' } })).toEqual({ feedback: {} });
  });

  test('a rating model keeps its valid terms and requirements and drops the rest', ({ expect }) => {
    const model = toRatingModel({
      version: 3,
      terms: [
        { id: 'ok', label: 'Ok', weight: 1, value: { prop: 'x' }, shape: { target: 4.9, tolerance: 0.1 } },
        { id: 'bad', label: 'Bad', weight: 1, value: 'schema:name', shape: 'flag' },
      ],
      require: [
        { label: 'Named', value: 'schema:name', op: '=', target: 1 },
        { label: 'Cheap', value: { prop: 'price' }, op: '<', target: 100 },
      ],
    });
    expect(model?.terms.map((term) => term.id)).toEqual(['ok']);
    expect(model?.require?.map((requirement) => requirement.label)).toEqual(['Cheap']);
  });

  test('a reported session is not busy; a missing run is no session', ({ expect }) => {
    expect(toSession({ run: 'r', status: 'reported' })?.busy).toBe(false);
    expect(toSession({ status: 'running' })).toBeUndefined();
  });
});
