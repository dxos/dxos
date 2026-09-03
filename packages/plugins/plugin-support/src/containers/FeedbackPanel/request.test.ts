//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type SupportOperation } from '#types';

import { formatPublicMessage, formatRequestMessage } from './request';

const values: SupportOperation.SupportRequest = {
  type: 'bug',
  severity: 'Low priority',
  title: 'Broken',
  body: 'It broke.',
};

describe('formatRequestMessage', () => {
  test('omits the image when no screenshot url is supplied', () => {
    expect(formatRequestMessage(values)).not.toContain('![Screenshot]');
  });

  test('embeds the screenshot above the body', () => {
    const message = formatRequestMessage(values, 'https://images.dxos.org/abc.jpg');
    expect(message).toContain('![Screenshot](https://images.dxos.org/abc.jpg)');
    expect(message.indexOf('![Screenshot]')).toBeLessThan(message.indexOf('It broke.'));
  });

  test('carries the DID for the team identity lookup', () => {
    const message = formatRequestMessage(values, undefined, 'did:dx:example');
    expect(message).toContain('**DID:** did:dx:example');
  });

  test('omits the DID when the submitter has no identity', () => {
    expect(formatRequestMessage(values)).not.toContain('**DID:**');
  });

  test('omits triage fields the submitter left unset', () => {
    const message = formatRequestMessage({ title: 'Broken', body: 'It broke.' });
    expect(message).not.toContain('**Type:**');
    expect(message).not.toContain('**Severity:**');
  });
});

describe('formatPublicMessage', () => {
  test('carries only what the user wrote', () => {
    expect(formatPublicMessage(values)).toEqual('# Broken\n\nIt broke.');
  });
});
