//
// Copyright 2025 DXOS.org
//

import { xmlLanguage } from '@codemirror/lang-xml';
import { type Extension } from '@codemirror/state';
import { type ParseWrapper, parseMixed } from '@lezer/common';
import { type BlockParser } from '@lezer/markdown';

import { createMarkdownExtensions } from '../markdown';
import { type XmlWidgetRegistry } from './xml-tags';

export type ExtendedMarkdownOptions = {
  registry?: XmlWidgetRegistry;
};

/** Escapes a string for safe embedding in RegExp source. */
const escapeRegExpSource = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Extended markdown parser with mixed parser for custom rendering of XML tags.
 */
export const extendedMarkdown = ({ registry }: ExtendedMarkdownOptions = {}): Extension => {
  return [
    createMarkdownExtensions({
      extensions: [
        {
          wrap: mixedParser(registry),
          parseBlock: [
            // Disable SetextHeading since it causes flickering when parsing/rendering tasks in chunks.
            {
              name: 'SetextHeading',
              parse: () => false,
            },
            // Custom XML block parser that keeps registered tags as a single HTMLBlock
            // even when their content contains blank lines.
            ...xmlBlockParsers(registry),
          ],
        },
      ],
    }),
  ];
};

/**
 * Creates block parsers for registered XML tags that may contain blank lines.
 *
 * By default, the markdown parser treats custom HTML tags as type 6 HTML blocks,
 * which end at blank lines. This causes tags like `<reasoning>...\n\n...</reasoning>`
 * to be split into separate blocks, preventing the XML mixed parser from seeing the
 * full element. This custom parser consumes all lines (including blanks) until the
 * matching closing tag, emitting a single HTMLBlock.
 */
const xmlBlockParsers = (registry?: XmlWidgetRegistry): BlockParser[] => {
  const customTags = Object.keys(registry ?? {});
  if (customTags.length === 0) {
    return [];
  }

  const tagPattern = customTags.map(escapeRegExpSource).join('|');
  const selfClosePattern = new RegExp(`^\\s*<(${tagPattern})(\\s[^>]*)?\\/>`);
  const openPattern = new RegExp(`^\\s*<(${tagPattern})(\\s[^>]*)?\\/?>`)

  return [
    {
      name: 'XMLBlock',
      before: 'HTMLBlock',
      parse: (cx, line) => {
        const match = openPattern.exec(line.text);
        if (!match) {
          return false;
        }

        // Self-closing tag (e.g., `<tag />` or `<tag id="x" />`).
        if (selfClosePattern.test(line.text)) {
          const end = cx.lineStart + line.text.length;
          cx.addElement(cx.elt('HTMLBlock', cx.lineStart, end));
          cx.nextLine();
          return true;
        }

        const tagName = match[1];
        const closeTag = `</${tagName}>`;
        const start = cx.lineStart;

        // Check if closing tag is on the same line.
        if (line.text.includes(closeTag)) {
          cx.addElement(cx.elt('HTMLBlock', start, start + line.text.length));
          cx.nextLine();
          return true;
        }

        // Consume lines (including blank lines) until the closing tag.
        let end = cx.lineStart + line.text.length;
        while (cx.nextLine()) {
          end = cx.lineStart + line.text.length;
          if (line.text.includes(closeTag)) {
            cx.addElement(cx.elt('HTMLBlock', start, end));
            cx.nextLine();
            return true;
          }
        }

        // Unclosed tag (e.g., still streaming) — emit what we have.
        cx.addElement(cx.elt('HTMLBlock', start, end));
        return true;
      },
    },
  ];
};

/**
 * Configure mixed parser to recognize custom tags.
 */
const mixedParser = (registry?: XmlWidgetRegistry): ParseWrapper => {
  const customTags = Object.keys(registry ?? {});
  const tagPattern = new RegExp(`<(${customTags.join('|')})`);

  return parseMixed((node, input) => {
    switch (node.name) {
      // Ignore XML inside of fenced and inline code.
      case 'FencedCode':
      case 'InlineCode': {
        return null;
      }

      // Parse multi-line HTML blocks.
      // case 'XMLBlock':
      case 'HTMLBlock': {
        return {
          parser: xmlLanguage.parser,
        };
      }

      // Parse paragraphs that contain custom XML tags.
      // TODO(burdon): Entire paragraph should be parsed as XML.
      case 'Paragraph': {
        const content = input.read(node.from, node.to);
        if (tagPattern.test(content)) {
          return {
            parser: xmlLanguage.parser,
          };
        }

        return null;
      }
    }

    return null;
  });
};
