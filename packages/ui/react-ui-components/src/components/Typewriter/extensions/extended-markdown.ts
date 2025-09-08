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
import { type MarkdownExtension } from '@lezer/markdown';

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
  switch (node.name) {
    case 'FencedCode':
    case 'InlineCode': {
      return null;
    }

    // Parse entire HTML and XML blocks.
    case 'XMLBlock':
    case 'HTMLBlock': {
      return {
        parser: customXMLParser,
      };
    }

    // Parse paragraphs that contain custom XML tags.
    case 'Paragraph': {
      const customTags = Object.values(customXMLNodes).map((node) => node.tag);
      const tagPattern = new RegExp(`<(${customTags.join('|')})`);
      const content = input.read(node.from, node.to);
      if (tagPattern.test(content)) {
        return {
          parser: customXMLParser,
        };
      }

      return null;
    }
  }

  return null;
});

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
  parseBlock: [disableSetextHeading],
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
