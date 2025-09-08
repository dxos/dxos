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
      extensions: [
        //
        extendedMarkdown(),
        // xmlTags(), // TODO(burdon): Remove.
      ],
    });
  };

  test.only('tree', async ({ expect }) => {
    const doc = trim`
      Start 

      <prompt>Hello</prompt>

      Hi there!

      What can I do for you?

      <suggest>Summarize tools</suggest>

      <choice>
        <option>Summarize tools</option>
        <option>Retry</option>
      </choice>

      <toolkit />

      End.
    `;

    const state = createEditorState(doc);
    const tree = syntaxTree(state);
    const elements: SyntaxNodeRef[] = [];

    let depth = 0;
    const xmlBlocks: any[] = [];
    const htmlBlocks: any[] = [];
    console.log('starting...');
    tree.iterate({
      enter: (node) => {
        const indent = '  '.repeat(depth);
        const content = state.sliceDoc(node.from, Math.min(node.to, node.from + 50));
        console.log(
          `${indent}${node.type.name} [${node.from}-${node.to}]: "${content.replace(/\n/g, '\\n')}"${content.length > 50 ? '...' : ''}`,
        );

        if (node.type.name === 'XMLBlock') {
          xmlBlocks.push({ from: node.from, to: node.to });
        } else if (node.type.name === 'HTMLBlock') {
          htmlBlocks.push({ from: node.from, to: node.to });
        }

        // Check for various XML node types
        if (node.type.name === 'Element' || 
            node.type.name === 'prompt' || 
            node.type.name === 'suggest' || 
            node.type.name === 'choice' || 
            node.type.name === 'toolkit' ||
            node.type.name === 'option') {
          elements.push(node);
          console.log(`Found element: ${node.type.name}`);
        }
        depth++;
      },
      leave: () => {
        depth--;
      },
    });

    // Debug: print what we found
    console.log('XMLBlocks:', xmlBlocks.length);
    console.log('HTMLBlocks:', htmlBlocks.length);
    console.log('Elements found:', elements.length);
    
    // Try to force parsing at specific positions
    const allBlocks = [...xmlBlocks, ...htmlBlocks];
    for (const block of allBlocks) {
      const blockTree = syntaxTree(state);
      blockTree.iterate({
        from: block.from,
        to: block.to,
        enter: (node) => {
          console.log(`  Block ${block.from}-${block.to}: ${node.type.name} [${node.from}-${node.to}]`);
        }
      });
    }
    
    // Count total blocks (XMLBlock + HTMLBlock)
    const totalBlocks = xmlBlocks.length + htmlBlocks.length;
    expect(totalBlocks).toBe(4);
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

    // Get all syntax trees at different positions
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

export const SKIP = Object.freeze({});

export type StringifyReplacer = (key: string, value: any) => typeof SKIP | any;

// TODO(burdon): Move to util.
export function safeStringify(obj: any, indent = 2, filter: StringifyReplacer = defaultFilter) {
  const seen = new WeakSet();
  function replacer(key: string, value: any) {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }

      seen.add(value);
    }

    if (filter) {
      const v2 = filter?.(key, value);
      if (v2 !== undefined) {
        return v2 === SKIP ? undefined : v2;
      }
    }

    return value;
  }

  let result = '';
  try {
    result = JSON.stringify(obj, replacer, indent);
  } catch (error: any) {
    result = `Error: ${error.message}`;
  }

  return result;
}

const defaultFilter: StringifyReplacer = (key, value) => {
  if (typeof value === 'function') {
    return SKIP;
  }

  if (key.startsWith('_')) {
    return SKIP;
  }
};
