//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type SupportOperation } from '#types';

import { formatRequestMessage } from './request';

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
});
