//
// Copyright 2025 DXOS.org
//

import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { xmlLanguage } from '@codemirror/lang-xml';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { type Extension } from '@codemirror/state';
import { type ParseWrapper, parseMixed } from '@lezer/common';
import { styleTags, tags as t } from '@lezer/highlight';
import { type BlockContext, type Line, type MarkdownExtension } from '@lezer/markdown';

export type ExtendedMarkdownOptions = {};

/**
 * Extended markdown parser with mixed parser for custom rendering of XML tags.
 */
export const extendedMarkdown = (_options: ExtendedMarkdownOptions = {}): Extension => {
  return [
    markdown({
      base: markdownLanguage,
      codeLanguages: languages,
      extensions: [customMarkdownExtension()],
    }),
    syntaxHighlighting(HighlightStyle.define([])),
  ];
};

// TODO(burdon): Configure.
const customXMLNodes = {
  Prompt: {
    tag: 'prompt',
    className: 'cm-prompt',
    multiline: true,
  },
  Suggest: {
    tag: 'suggest',
    className: 'cm-suggest',
    multiline: true,
  },
  Toolkit: {
    tag: 'toolkit',
    className: 'cm-toolkit',
    multiline: false,
  },
  Choice: {
    tag: 'choice',
    className: 'cm-choice',
    multiline: true,
  },
  Option: {
    tag: 'option',
    className: 'cm-option',
    multiline: true,
  },
};

/**
 * Configure XML parser to recognize custom tags.
 */
const customXMLParser = xmlLanguage.parser.configure({
  props: [
    styleTags({
      Element: t.special(t.tagName),
      Text: t.content,
      'StartTag EndTag SelfClosingTag': t.angleBracket,
      TagName: t.tagName,
      AttributeName: t.attributeName,
      AttributeValue: t.attributeValue,
    }),
  ],
});

/**
 * Configure mixed parser to recognize custom tags.
 */
export const mixedParser: ParseWrapper = parseMixed((node, input) => {
  const customTags = Object.values(customXMLNodes).map((node) => node.tag);
  const xmlPattern = new RegExp(
    `<(${customTags.join('|')})(?:[^>]*)>.*?</\\1>|<(${customTags.join('|')})\\s*/>`,
    'gis',
  );

  switch (node.name) {
    case 'FencedCode':
    case 'InlineCode': {
      return null;
    }

    case 'XMLBlock': {
      return {
        parser: customXMLParser,
        overlay: [
          {
            from: node.from,
            to: node.to,
          },
        ],
      };
    }

    case 'HTMLBlock': {
      return {
        parser: customXMLParser,
        overlay: [
          {
            from: node.from,
            to: node.to,
          },
        ],
      };
    }

    case 'Document': {
      // Find all custom XML blocks within the document.
      const text = input.read(node.from, node.to);
      const matches = [...text.matchAll(xmlPattern)];
      if (matches.length > 0) {
        return {
          parser: customXMLParser,
          overlay: matches.map((match) => ({
            from: node.from + match.index!,
            to: node.from + match.index! + match[0].length,
          })),
        };
      }
      break;
    }

    case 'Paragraph': {
      // Check if the entire paragraph is a single XML element.
      const text = input.read(node.from, node.to).trim();
      const singleXmlPattern = new RegExp(
        `^<(${customTags.join('|')})(?:[^>]*)>.*?</\\1>$|^<(${customTags.join('|')})\\s*/>$`,
        's',
      );

      // Parse the entire paragraph as XML.
      if (singleXmlPattern.test(text)) {
        return {
          parser: customXMLParser,
          overlay: [
            {
              from: node.from,
              to: node.to,
            },
          ],
        };
      }

      // Otherwise, look for XML fragments within the paragraph.
      const matches = [...text.matchAll(xmlPattern)];
      if (matches.length > 0) {
        return {
          parser: customXMLParser,
          overlay: matches.map((match) => ({
            from: node.from + match.index!,
            to: node.from + match.index! + match[0].length,
          })),
        };
      }
      break;
    }
  }

  return null;
});

/**
 * Custom block parser for XML elements.
 */
const xmlBlockParser = {
  name: 'XMLBlock',
  parse: (cx: BlockContext, line: Line) => {
    const customTags = Object.values(customXMLNodes).map((node) => node.tag);
    const openTagPattern = new RegExp(`^<(${customTags.join('|')})(?:\\s[^>]*)?>`, 's');
    const selfClosingPattern = new RegExp(`^<(${customTags.join('|')})\\s*/>$`);

    // Check for self-closing tags first
    if (selfClosingPattern.test(line.text)) {
      const start = cx.lineStart + line.pos;
      const end = start + line.text.length;
      cx.addElement(cx.elt('XMLBlock', start, end));
      cx.nextLine();
      return true;
    }

    // Check if this line starts with an opening tag.
    const match = openTagPattern.exec(line.text);
    if (match) {
      const tagName = match[1];

      // Check if it's a single-line element.
      if (line.text.includes(`</${tagName}>`)) {
        const start = cx.lineStart + line.pos;
        const end = start + line.text.length;
        cx.addElement(cx.elt('XMLBlock', start, end));
        cx.nextLine();
        return true;
      }

      // Multi-line element: consume lines until closing tag.
      const start = cx.lineStart + line.pos;
      let depth = 1;

      // Keep consuming lines until we find the matching closing tag.
      while (cx.nextLine()) {
        // Check if current line contains opening tags.
        const openingPattern = new RegExp(`<${tagName}(?:\\s[^>]*)?>`, 'g');
        const openMatches = line.text.match(openingPattern);
        if (openMatches) {
          depth += openMatches.length;
        }

        // Check if current line contains closing tags.
        const closingPattern = new RegExp(`</${tagName}>`, 'g');
        const closeMatches = line.text.match(closingPattern);
        if (closeMatches) {
          depth -= closeMatches.length;
          if (depth === 0) {
            // Found the matching closing tag.
            cx.nextLine(); // Move past the closing tag line.
            break;
          }
        }
      }

      // Create XMLBlock for the entire range.
      const end = cx.prevLineEnd();
      cx.addElement(cx.elt('XMLBlock', start, end));
      return true;
    }

    return false;
  },
  before: 'HTMLBlock',
};

// Define XML node types.
const xmlNodeTypes = [
  'Element',
  'OpenTag',
  'CloseTag',
  'StartTag',
  'EndTag',
  'TagName',
  'Text',
  'SelfClosingTag',
  'StartCloseTag',
  'SelfCloseEndTag',
];

/**
 * Disable SetextHeading since it causes flickering when parsing tasks.
 */
// TODO(burdon): Change to require three or more dashes?
const disableSetextHeading = {
  name: 'SetextHeading',
  parse: () => false,
};

const customMarkdownExtension = (): MarkdownExtension => ({
  wrap: mixedParser,
  parseBlock: [xmlBlockParser, disableSetextHeading],
  defineNodes: [
    {
      name: 'XMLBlock',
      block: true,
      style: t.special(t.tagName),
    },
    // Define all XML node types.
    ...xmlNodeTypes.map((name) => ({ name, style: t.special(t.tagName) })),
  ],
  props: [
    styleTags({
      // Standard markdown styling.
      'ATXHeading1 ATXHeading2 ATXHeading3 ATXHeading4 ATXHeading5 ATXHeading6': t.heading,

      // Custom XML node styling.
      XMLBlock: t.special(t.tagName),
      Element: t.special(t.tagName),
      OpenTag: t.angleBracket,
      CloseTag: t.angleBracket,
      StartTag: t.angleBracket,
      EndTag: t.angleBracket,
      StartCloseTag: t.angleBracket,
      TagName: t.tagName,
      Text: t.content,
      SelfClosingTag: t.angleBracket,
      ...Object.fromEntries(
        Object.entries(customXMLNodes).map(([_name, config]) => [config.tag, t.special(t.tagName)]),
      ),
    }),
  ],
});
