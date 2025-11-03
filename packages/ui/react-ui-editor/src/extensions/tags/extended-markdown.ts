//
// Copyright 2025 DXOS.org
//

import { xmlLanguage } from '@codemirror/lang-xml';
import { type Extension } from '@codemirror/state';
import { type ParseWrapper, parseMixed } from '@lezer/common';

import { createMarkdownExtensions } from '../markdown';

import { type XmlWidgetRegistry } from './xml-tags';

export type ExtendedMarkdownOptions = {
  registry?: XmlWidgetRegistry;
};

/**
 * Extended markdown parser with mixed parser for custom rendering of XML tags.
 */
export const extendedMarkdown = ({ registry }: ExtendedMarkdownOptions = {}): Extension => [
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
        ],
      },
    ],
  }),
];

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
