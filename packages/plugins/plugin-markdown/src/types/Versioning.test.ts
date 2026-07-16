//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { Branch, Version } from '@dxos/versioning';

import * as Markdown from './Markdown';

describe('Versioning schema', () => {
  test('document accepts an optional history struct', () => {
    const doc = Markdown.make({ content: 'hello' });
    expect(doc.history).toBeUndefined();

    Obj.update(doc, (doc) => {
      doc.history = { branches: [], versions: [] };
    });
    expect(doc.history?.versions).toEqual([]);
  });

  test('makeVersion/makeBranch produce valid records', () => {
    const doc = Markdown.make({ content: 'hello' });
    const version = Version.make({ target: doc.content, heads: ['abc'], name: 'v1' });
    expect(version.id).toBeDefined();
    expect(version.heads).toEqual(['abc']);

    const branch = Branch.make({
      content: doc.content,
      parent: doc.content,
      anchor: ['abc'],
      name: 'draft',
    });
    expect(branch.status).toBe('active');
  });
});
