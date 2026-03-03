//
// Copyright 2025 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { describe, it } from 'vitest';

import { Trigger } from '@dxos/async';
import { trim } from '@dxos/util';

import { extendedMarkdown } from './extended-markdown';
import { xmlTags } from './xml-tags';
import { nodeToJson } from './xml-util';

describe('nodeToJson', () => {
  it('should parse a simple element', async ({ expect }) => {
    const xml = trim`
      # Test

      <test id="123" foo="100" />
    `;

    const state = EditorState.create({
      doc: xml,
      extensions: [extendedMarkdown(), xmlTags()],
    });

    const value = new Trigger<any>();
    syntaxTree(state).iterate({
      enter: (node) => {
        switch (node.type.name) {
          case 'Element': {
            const args = nodeToJson(state, node.node);
            value.wake(args);
            break;
          }
        }
      },
    });

    expect(await value.wait()).toEqual({
      _tag: 'test',
      id: '123',
      foo: '100',
    });
  });
});
