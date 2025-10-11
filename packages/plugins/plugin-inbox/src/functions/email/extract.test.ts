//
// Copyright 2025 DXOS.org
//

import { readFileSync } from 'fs';
import { resolve } from 'path';

import * as yaml from 'js-yaml';
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
    expect(data.contacts.length).toBe(5);

    const expectedResults = [
      { email: 'success@vouch.us', name: 'Frank Rodriguez', company: undefined },
      { email: 'ymaline@citrincooperman.com', name: 'Yaakov Maline', company: 'CITRIN COOPERMAN' },
      { email: 'mahern@kirkconsult.com', name: 'Madeline Ahern', company: undefined },
      { email: 'mscheriff@kirkconsult.com', name: 'Morgan Scheriff', company: 'Kirk Consulting LLC' },
      { email: 'patrick@dispersion.xyz', name: 'Patrick Chang', company: 'Dispersion Capital' },
    ];

    data.contacts.forEach((contact, index) => {
      const parsed = parseSignature(contact.body);
      const expected = expectedResults[index];

      expect(parsed.name).toBe(expected.name);
      expect(parsed.company).toBe(expected.company);
    });
  });
});
