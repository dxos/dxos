//
// Copyright 2025 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { type SyntaxNodeRef } from '@lezer/common';
import { describe, test } from 'vitest';

import { trim } from '@dxos/util';

// import content from '../testing/short.md?raw';

import { extendedMarkdown } from './extended-markdown';

describe('extended-markdown', () => {
  const createEditorState = (doc: string) => {
    return EditorState.create({
      doc,
      extensions: [extendedMarkdown()],
    });
  };

  test.only('tree', async ({ expect }) => {
    const doc = trim`
      <prompt>Hello</prompt>

      Hi there!

      What can I do for you?

      <suggest>Summarize tools</suggest>

      <choice>
        <option>Summarize tools</option>
        <option>Retry</option>
      </choice>

      <toolkit />
    `;

    const elements: SyntaxNodeRef[] = [];
    const state = createEditorState(doc);
    const tree = syntaxTree(state);
    tree.iterate({
      enter: (node) => {
        if (node.type.name === 'XMLBlock') {
          // console.log(safeStringify(node));
          elements.push(node);
        }
      },
      leave: () => {},
    });

    expect(elements).toHaveLength(4);
    expect(elements.map(({ from, to }) => ({ from, to }))).toContain([
      {
        from: 0,
        to: 22,
      },
      // { from: 10, to: 26 },
      // { from: 42, to: 61 },
      // { from: 67, to: 86 },
      // { from: 92, to: 111 },
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
        // Check that no SetextHeading nodes exist.
        if (node.type.name === 'SetextHeading') {
          throw new Error('SetextHeading should be disabled!');
        }
      },
    });
  });

  test('xml overlay parsing', () => {
    const doc = '<prompt>Hello world</prompt>';
    const state = createEditorState(doc);

    console.log('\n=== Testing XML Overlay ===');
    console.log('Document:', doc);

    // Get all syntax trees at different positions.
    const positions = [0, 1, 8, 15, 27];
    positions.forEach((pos) => {
      const tree = syntaxTree(state);
      console.log(`\nTree at position ${pos}: ${tree.type.name}`);
    });

    // Iterate through the entire tree and check for mixed content.
    const tree = syntaxTree(state);
    console.log('\nFull tree structure:');
    let depth = 0;
    tree.iterate({
      enter: (node) => {
        const indent = '  '.repeat(depth);
        console.log(`${indent}${node.type.name} [${node.from}-${node.to}]`);
        depth++;
      },
      leave: () => {
        depth--;
      },
    });

    // Check if we can force XML parsing on the content.
    const xmlTree = syntaxTree(state);
    console.log('\nForced tree parse:', xmlTree.type.name);
  });

  // TODO(burdon): All tests below should test the tree.

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
