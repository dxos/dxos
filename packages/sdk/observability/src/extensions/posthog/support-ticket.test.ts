//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { supportTicketMessage } from './support-ticket';

describe('supportTicketMessage', () => {
  test('carries the debug-log location beneath the report', ({ expect }) => {
    expect(
      supportTicketMessage('# Sync broken\n\nSpaces stopped syncing.', 'composer-feedback-logs/dev/a.ndjson'),
    ).toEqual('# Sync broken\n\nSpaces stopped syncing.\n\nDebug logs: `composer-feedback-logs/dev/a.ndjson`');
  });

  test('passes the report through when there is no dump', ({ expect }) => {
    expect(supportTicketMessage('# Sync broken', null)).toEqual('# Sync broken');
  });
});
