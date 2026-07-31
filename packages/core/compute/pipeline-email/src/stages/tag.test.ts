//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { applyBulkTag, classifyBulk, parseTagResult } from './tag';

describe('parseTagResult', () => {
  test('parses tags (lowercased) and spam flag', ({ expect }) => {
    const result = parseTagResult('{"tags":["Invoice","Finance"],"spam":false}');
    expect(result.tags).toEqual(['invoice', 'finance']);
    expect(result.spam).toBe(false);
    expect(result.bulk).toBe(false);
  });

  test('flags bulk when the model emits the tag', ({ expect }) => {
    const result = parseTagResult('{"tags":["receipt","bulk"],"spam":false}');
    expect(result.bulk).toBe(true);
  });

  test('extracts JSON wrapped in prose', ({ expect }) => {
    const result = parseTagResult('Here you go:\n{"tags":["personal"],"spam":false}\nHope that helps.');
    expect(result.tags).toEqual(['personal']);
  });

  test('infers spam from a spam tag and dedups it', ({ expect }) => {
    const result = parseTagResult('{"tags":["spam","marketing"]}');
    expect(result.spam).toBe(true);
    expect(result.tags.filter((tag) => tag === 'spam')).toHaveLength(1);
  });

  test('adds the spam tag when the flag is set but the tag is missing', ({ expect }) => {
    const result = parseTagResult('{"tags":["promo"],"spam":true}');
    expect(result.spam).toBe(true);
    expect(result.tags).toContain('spam');
  });

  test('degrades to empty on unparseable output', ({ expect }) => {
    const result = parseTagResult('no json here');
    expect(result.tags).toEqual([]);
    expect(result.spam).toBe(false);
    expect(result.bulk).toBe(false);
  });
});

describe('classifyBulk', () => {
  test('receipts and login/security notices are bulk', ({ expect }) => {
    expect(classifyBulk({ subject: 'Receipt from Anthropic PBC' })).toBe('bulk');
    expect(classifyBulk({ subject: 'Your receipt from HeyGen Inc' })).toBe('bulk');
    expect(classifyBulk({ subject: 'Linear login' })).toBe('bulk');
    expect(classifyBulk({ subject: 'New sign-in to your account' })).toBe('bulk');
    expect(classifyBulk({ subject: 'Your order has shipped' })).toBe('bulk');
  });

  test('invoices and payment requests are action-required, never bulk', ({ expect }) => {
    expect(classifyBulk({ subject: 'Invoice #4021 — payment due' })).toBe('action');
    expect(classifyBulk({ subject: 'Payment reminder', senderEmail: 'billing@acme.com' })).toBe('action');
    expect(classifyBulk({ subject: 'Your invoice receipt' })).toBe('action');
  });

  test('a person with no automated signal is unknown (left to the model / person gate)', ({ expect }) => {
    expect(classifyBulk({ subject: 'Barbera Corporate — Dmytro', senderEmail: 'dmytro@barbera.com' })).toBe('unknown');
  });

  test('a no-reply / notifications local part is bulk when the subject is silent', ({ expect }) => {
    expect(classifyBulk({ subject: 'Update', senderEmail: 'no-reply@service.io' })).toBe('bulk');
    expect(classifyBulk({ subject: 'Update', senderEmail: 'notifications@service.io' })).toBe('bulk');
  });

  test('an unsubscribe affordance (header or body link) deterministically marks bulk', ({ expect }) => {
    // List-Unsubscribe header (real synced mail).
    expect(classifyBulk({ subject: 'Interview with Eric Ries', listUnsubscribe: '<https://x.io/unsub>' })).toBe('bulk');
    // Unsubscribe link in the body (e.g. the fixture, no header).
    expect(classifyBulk({ subject: 'Interview with Eric Ries', bodyText: 'Great read.\n\nUnsubscribe here.' })).toBe(
      'bulk',
    );
    // Outranks an action-looking subject — transactional invoices don't carry an unsubscribe link.
    expect(classifyBulk({ subject: 'Invoice #12 payment due', bodyText: 'Click to unsubscribe.' })).toBe('bulk');
    // No unsubscribe → the normal person path.
    expect(classifyBulk({ subject: 'Interview with Eric Ries', bodyText: 'Looking forward to it.' })).toBe('unknown');
  });
});

describe('applyBulkTag', () => {
  test('adds bulk for no-action mail (deduped)', ({ expect }) => {
    expect(applyBulkTag(['receipt'], 'bulk')).toEqual(['receipt', 'bulk']);
    expect(applyBulkTag(['receipt', 'bulk'], 'bulk')).toEqual(['receipt', 'bulk']);
  });

  test('strips bulk the model wrongly added to action-required mail', ({ expect }) => {
    expect(applyBulkTag(['invoice', 'bulk'], 'action')).toEqual(['invoice']);
  });

  test('leaves tags untouched when unknown', ({ expect }) => {
    expect(applyBulkTag(['personal'], 'unknown')).toEqual(['personal']);
  });
});
