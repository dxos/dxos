//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from 'vitest';

import { Obj } from '@dxos/echo';

import * as Markdown from './Markdown';
import * as Versioning from './Versioning';

describe('Versioning schema', () => {
  it('document accepts an optional history struct', () => {
    const doc = Markdown.make({ content: 'hello' });
    expect(doc.history).toBeUndefined();

    Obj.update(doc, (mutableDoc) => {
      mutableDoc.history = { branches: [], versions: [] };
    });
    expect(doc.history?.versions).toEqual([]);
  });

  it('makeVersion/makeBranch produce valid records', () => {
    const doc = Markdown.make({ content: 'hello' });
    const version = Versioning.makeVersion({ target: doc.content, heads: ['abc'], name: 'v1' });
    expect(version.id).toBeDefined();
    expect(version.heads).toEqual(['abc']);

    const branch = Versioning.makeBranch({
      content: doc.content,
      parent: doc.content,
      anchor: ['abc'],
      name: 'draft',
    });
    expect(branch.status).toBe('active');
  });
});
