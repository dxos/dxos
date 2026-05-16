//
// Copyright 2025 DXOS.org
//

import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { resolve } from 'path';
import { describe, test } from 'vitest';

import { type SignatureData, parseSignature } from './extract';

describe('sig parser', () => {
  test('parse signatures to extract names and companies', ({ expect }) => {
    const filePath = resolve(__dirname, 'testing', 'sig.yml');
    const fileContent = readFileSync(filePath, 'utf8');
    const data = yaml.load(fileContent) as SignatureData;
    expect(data).toBeDefined();
    expect(data.contacts).toBeDefined();
    expect(Array.isArray(data.contacts)).toBe(true);
    expect(data.contacts.length).toBe(6);

    const expectedResults = [
      { email: 'friendly@example.test', name: 'Quinn Hartwell', company: undefined },
      { email: 'tkessler@acmeadvisors.test', name: 'Theodore Kessler', company: 'ACME ADVISORS' },
      { email: 'hpenrose@lumenpartners.test', name: 'Harriet Penrose', company: undefined },
      { email: 'bostrow@lumenpartners.test', name: 'Beatrice Ostrow', company: 'Lumen Partners LLC' },
      { email: 'soren@drift.test', name: 'Soren Beckwith', company: 'Drift Capital' },
      { email: 'hello@mercury.test', name: undefined, company: 'Mercury Technologies, Inc.' },
    ];

    data.contacts.forEach((contact, index) => {
      const parsed = parseSignature(contact.body);
      const expected = expectedResults[index];

      expect(parsed.name).toBe(expected.name);
      expect(parsed.company).toBe(expected.company);
    });
  });
});
