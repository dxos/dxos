//
// Copyright 2025 DXOS.org
//

import TurndownService from 'turndown';
import { parseHTML } from 'linkedom';

import { type MessageDetails } from './types';

export const getPart = (message: MessageDetails, part: string) =>
  message.payload.parts?.find(({ mimeType }) => mimeType === part)?.body.data;

/**
 * https://www.npmjs.com/package/turndown
 */
export const turndown = new TurndownService({
  bulletListMarker: '-',
})
  .remove('script')
  .remove('style')
  .addRule('cleanListSpacing', {
    filter: 'li',
    replacement: (content, node, options) => {
      content = content.replace(/\n{2,}/g, '\n').trim();
      const parent = node.parentNode;
      const isOrdered = parent && parent.nodeName === 'OL';
      if (isOrdered) {
        // Find the item index for ordered lists.
        const index = Array.prototype.indexOf.call(parent.children, node) + 1;
        return `${index}. ${content}\n`;
      } else {
        // Unordered list: single dash + single space.
        return `${options.bulletListMarker} ${content}\n`;
      }
    },
  });

export const toMarkdown = (html: string): string => turndown.turndown(parseHTML(html).document.body);

export const isHTML = (str: string): boolean => {
  return /<(\/?(p|div|span|ul|ol|li|a|strong|em|br|table|tr|td|h[1-6]))\b[^>]*>/i.test(str);
};

export const stripWhitespace = (str: string): string => {
  const WHITESPACE = /[ \t\u00A0]*\n[ \t\u00A0]*\n[\s\u00A0]*/g;
  return (
    str
      .trim()
      // Replace multiple newlines with double newlines.
      .replace(WHITESPACE, '\n\n')
      // Replace old-school sign-off dash with horizontal rule.
      .replace(/\\--/g, '---')
  );
};

// TODO(burdon): Replace legal disclaimers, etc.
export const normalizeText = (text: string): string => {
  const str = isHTML(text) ? toMarkdown(text) : text;
  return stripWhitespace(str);
};

/**
 * Parses an email string in the format "Name <email@example.com>" into separate name and email components.
 */
export const parseFromHeader = (value: string): { name?: string; email: string } | undefined => {
  const EMAIL_REGEX = /^([^<]+?)\s*<([^>]+@[^>]+)>$/;
  const removeOuterQuotes = (str: string) => str.replace(/^['"]|['"]$/g, '');
  const match = value.match(EMAIL_REGEX);
  if (match) {
    const [, name, email] = match;
    return {
      name: removeOuterQuotes(name.trim()),
      email: email.trim(),
    };
  }
};
