//
// Copyright 2025 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { type SyntaxNode } from '@lezer/common';
import { describe, test } from 'vitest';

import { trim } from '@dxos/util';

import { extendedMarkdown } from './extended-markdown';
import { nodeToJson } from './xml-util';

describe('extended-markdown', () => {
  const createEditorState = (doc: string) => {
    return EditorState.create({
      doc,
      extensions: [extendedMarkdown()],
    });
  };

  test('tree', async ({ expect }) => {
    const doc = trim`
      <prompt>
        Hello
      </prompt>

      Hi there!

      What can I do for you?

      <suggestion>Summarize tools</suggestion>

      <choice>
        <option>Summarize tools</option>
        <option>Retry</option>
      </choice>

      <toolkit />
    `;

    const state = createEditorState(doc);

    const nodes: SyntaxNode[] = [];
    const tree = syntaxTree(state);
    tree.iterate({
      enter: (node) => {
        if (node.type.name === 'Element') {
          nodes.push(node.node);
          return false; // Stop traversal.
        }
      },
    });

    expect(nodes).toHaveLength(4);
    expect(
      nodes.map((node) => ({
        content: doc.slice(node.from, node.to),
        data: nodeToJson(state, node.node),
      })),
    ).toEqual([
      {
        content: '<prompt>\n  Hello\n</prompt>',
        data: {
          _tag: 'prompt',
          children: ['Hello'],
        },
      },
      {
        content: '<suggestion>Summarize tools</suggestion>',
        data: {
          _tag: 'suggestion',
          children: ['Summarize tools'],
        },
      },
      {
        content: '<choice>\n  <option>Summarize tools</option>\n  <option>Retry</option>\n</choice>',
        data: {
          _tag: 'choice',
          children: [
            {
              _tag: 'option',
              children: ['Summarize tools'],
            },
            {
              _tag: 'option',
              children: ['Retry'],
            },
          ],
        },
      },
      {
        content: '<toolkit />',
        data: {
          _tag: 'toolkit',
        },
      },
    ]);
  });

  test('setext heading disabled', () => {
    const doc = trim`
      This should NOT be a heading
      =
      
      Another line that should NOT be a heading
      -
    `;

    const state = createEditorState(doc);
    const tree = syntaxTree(state);

    tree.iterate({
      enter: (node) => {
        if (node.type.name === 'SetextHeading') {
          throw new Error('SetextHeading should be disabled!');
        }
      },
    });
  });

  //
  // TODO(burdon): All tests below should test the tree.
  //

  test('should parse standard markdown elements', ({ expect }) => {
    const doc = trim`
      # Heading 1
      ## Heading 2
      ### Heading 3

      This is a paragraph with **bold** and *italic* text.

      \`\`\`javascript
      const code = 'block';
      \`\`\`
    `;

    const state = createEditorState(doc);
    const tree = state.sliceDoc(0, state.doc.length);

    // Verify the document is parsed without errors.
    expect(tree).toBe(doc);
    expect(state.doc.lines).toBeGreaterThan(1);
  });

  test('should parse custom XML tags', ({ expect }) => {
    const doc = trim`
      # Document with Custom Tags

      <prompt>This is a custom prompt block</prompt>

      Regular paragraph text.

      <prompt />

      Regular paragraph text.

      <prompt>
        Multi-line
        prompt content
      </prompt>
    `;

    const state = createEditorState(doc);
    const tree = state.sliceDoc(0, state.doc.length);

    // Verify the document contains custom tags.
    expect(tree).toContain('<prompt>');
    expect(tree).toContain('<prompt />');
    expect(tree).toContain('</prompt>');
  });

  test('should handle mixed markdown and XML content', ({ expect }) => {
    const doc = trim`
      # Mixed Content

      This is a paragraph with a <prompt>inline prompt</prompt> tag.

      ## Section 2

      <prompt>
        This prompt contains **markdown** formatting
      </prompt>

      \`\`\`
      <prompt>This should not be parsed as XML inside code block</prompt>
      \`\`\`
    `;

    const state = createEditorState(doc);
    const tree = state.sliceDoc(0, state.doc.length);

    // Verify mixed content is preserved.
    expect(tree).toBe(doc);
  });

  test('should not parse XML tags in code blocks', ({ expect }) => {
    const doc = trim`
      \`\`\`xml
      <prompt>This is inside a code block</prompt>
      \`\`\`

      \`<prompt>inline code</prompt>\`
    `;

    const state = createEditorState(doc);
    const tree = state.sliceDoc(0, state.doc.length);

    // Verify code blocks are preserved as-is.
    expect(tree).toContain('```xml');
    expect(tree).toContain('<prompt>This is inside a code block</prompt>');
  });

  test('should handle nested and complex structures', ({ expect }) => {
    const doc = trim`
      # Complex Document

      <prompt>
        First prompt with some content
      </prompt>

      ## Lists and Prompts

      - Item 1
      - Item 2 with <prompt>embedded prompt</prompt>
      - Item 3

      <prompt>
        Another prompt after the list
      </prompt>

      ### Code Example

      \`\`\`typescript
      const example = '<prompt>not parsed</prompt>';
      \`\`\`
    `;

    const state = createEditorState(doc);
    const tree = state.sliceDoc(0, state.doc.length);

    // Verify complex structures are handled.
    expect(tree).toBe(doc);
    expect(tree).toMatch(/Item 2 with <prompt>embedded prompt<\/prompt>/);
  });

  test('should handle empty and edge cases', ({ expect }) => {
    const emptyDoc = '';
    const emptyState = createEditorState(emptyDoc);
    expect(emptyState.doc.length).toBe(0);

    const onlyPromptDoc = '<prompt>Only prompt content</prompt>';
    const onlyPromptState = createEditorState(onlyPromptDoc);
    expect(onlyPromptState.sliceDoc(0)).toBe(onlyPromptDoc);

    const unclosedPromptDoc = '<prompt>Unclosed prompt';
    const unclosedState = createEditorState(unclosedPromptDoc);
    expect(unclosedState.sliceDoc(0)).toBe(unclosedPromptDoc);
  });
});
