//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { Publisher } from './index';

describe('Publisher contract', () => {
  test('PublisherDraft decodes a minimal draft', () => {
    const draft = Schema.decodeUnknownSync(Publisher.PublisherDraft)({ id: 'abc', text: 'hello' });
    expect(draft.id).toBe('abc');
    expect(draft.text).toBe('hello');
  });

  test('PublisherError carries a message', () => {
    const error = new Publisher.PublisherError('nope');
    expect(error.message).toBe('nope');
  });
});
