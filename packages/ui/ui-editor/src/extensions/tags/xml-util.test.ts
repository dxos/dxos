//
// Copyright 2025 DXOS.org
//

import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { describe, test } from 'vitest';

import { trim } from '@dxos/util';

import { extendedMarkdown } from './extended-markdown';
import TEXT from './testing/text.md?raw';
import { xmlTags } from './xml-tags';
import { nodeToJson, type Tag } from './xml-util';

type ParsedElement = Tag & {
  /** Element spans the entire document (opening through closing tag). */
  complete: boolean;
};

/**
 * Helper to extract all parsed XML elements from a document.
 * Checks completeness by verifying the Element node has a CloseTag child.
 */
const parseElements = (doc: string, registry: Record<string, any> = {}): ParsedElement[] => {
  const state = EditorState.create({
    doc,
    extensions: [extendedMarkdown({ registry }), xmlTags({ registry })],
  });

  const tree = ensureSyntaxTree(state, doc.length, 5000) ?? syntaxTree(state);
  const elements: ParsedElement[] = [];
  tree.iterate({
    enter: (node) => {
      if (node.type.name === 'Element') {
        const tag = nodeToJson(state, node.node);
        if (tag) {
          const hasCloseTag = !!node.node.getChild('CloseTag');
          elements.push({
            ...tag,
            complete: hasCloseTag,
          });
        }
        return false;
      }
    },
  });

  return elements;
};

describe('nodeToJson', () => {
  test('should parse a simple element', ({ expect }) => {
    const xml = trim`
      # Test

      <test id="123" foo="100" />
    `;

    const elements = parseElements(xml);
    expect(elements).toHaveLength(1);
    expect(elements[0]).toMatchObject({
      _tag: 'test',
      id: '123',
      foo: '100',
    });
  });

  test('should parse tag with single-line content', ({ expect }) => {
    const xml = trim`
      <reasoning>The user is asking about markdown.</reasoning>
    `;

    const registry = { reasoning: { block: true } };
    const elements = parseElements(xml, registry);
    expect(elements).toHaveLength(1);
    expect(elements[0]._tag).toBe('reasoning');
    expect(elements[0].complete).toBe(true);
    expect(elements[0].children).toEqual(['The user is asking about markdown.']);
  });

  test('should parse tag with multi-line content without blank lines', ({ expect }) => {
    const xml = trim`
      <reasoning>
      The user is asking about markdown.
      This is a follow-up thought.
      </reasoning>
    `;

    const registry = { reasoning: { block: true } };
    const elements = parseElements(xml, registry);
    expect(elements).toHaveLength(1);
    expect(elements[0]._tag).toBe('reasoning');
    expect(elements[0].complete).toBe(true);
  });

  // BUG: Blank lines inside XML tags cause the markdown parser to split the content
  // into multiple blocks (HTMLBlock + Paragraph), preventing the XML mixed parser from
  // seeing the full element. The first HTMLBlock gets an incomplete Element (no CloseTag),
  // and the closing tag ends up in a Paragraph that's never parsed as XML.
  //
  // Syntax tree with blank lines:
  //   Document [0-28] → Element (incomplete: OpenTag + Text + ⚠ — no CloseTag)
  //   Paragraph [30-60] → "Second paragraph.\n</reasoning>"

  test('should parse tag with blank lines in content', ({ expect }) => {
    const xml = trim`
      <reasoning>
      The user is asking me to think deeply about what markdown is.

      But given the context of our conversation - we've been trying to scrape slab data from a website - I think they might be hinting at something specific.
      </reasoning>
    `;

    const registry = { reasoning: { block: true } };
    const elements = parseElements(xml, registry);
    expect(elements).toHaveLength(1);
    expect(elements[0]._tag).toBe('reasoning');
    expect(elements[0].complete).toBe(true);
  });

  // Regression: when reasoning text contains escaped XML (e.g. `&lt;foo&gt;`), Lezer XML
  // splits the inline content into Text + EntityReference + Text + EntityReference + Text
  // siblings. The walker used to skip entity references and push each text segment as a
  // separate child, so `getXmlTextChild(children)` only saw the prefix before the first
  // `&lt;` (e.g. ``"The user sent `"``).
  test('should preserve text containing entity references as a single child', ({ expect }) => {
    const xml = trim`
      <reasoning>The user sent \`&lt;foo&gt;\`, which appears to be an XML-like tag.</reasoning>
    `;

    const registry = { reasoning: { block: true } };
    const elements = parseElements(xml, registry);
    expect(elements).toHaveLength(1);
    expect(elements[0]._tag).toBe('reasoning');
    expect(elements[0].children).toEqual(['The user sent `<foo>`, which appears to be an XML-like tag.']);
  });

  test('should decode numeric character references', ({ expect }) => {
    const xml = trim`
      <reasoning>arrow &#8594; and hex &#x2192;</reasoning>
    `;

    const registry = { reasoning: { block: true } };
    const elements = parseElements(xml, registry);
    expect(elements).toHaveLength(1);
    expect(elements[0].children).toEqual(['arrow → and hex →']);
  });

  test('should parse tag with multiple blank lines in content', ({ expect }) => {
    const xml = trim`
      <reasoning>
      First paragraph.


      Second paragraph after two blank lines.
      </reasoning>
    `;

    const registry = { reasoning: { block: true } };
    const elements = parseElements(xml, registry);
    expect(elements).toHaveLength(1);
    expect(elements[0]._tag).toBe('reasoning');
    expect(elements[0].complete).toBe(true);
  });

  test('should parse text.md', ({ expect }) => {
    const elements = parseElements(TEXT);
    const tags = elements.map((element) => element._tag);
    expect(tags).toEqual([
      'prompt',
      'reasoning',
      'status',
      'toolCall',
      'toolCall',
      'reasoning',
      'status',
      'toolCall',
      'reasoning',
      'prompt',
      'reasoning',
      'prompt',
      'name',
    ]);
  });
});
