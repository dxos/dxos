//
// Copyright 2025 DXOS.org
//

import TurndownService from 'turndown';

import { type MessageDetails } from './types';

export const getPart = (message: MessageDetails, part: string) =>
  message.payload.parts?.find(({ mimeType }) => mimeType === part)?.body.data;

export const isHTML = (str: string) => {
  return /<(\/?(p|div|span|ul|ol|li|a|strong|em|br|table|tr|td|h[1-6]))\b[^>]*>/i.test(str);
};

/**
 * https://www.npmjs.com/package/turndown
 */
const turndown = new TurndownService({
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

export const toMarkdown = (html: string) => turndown.turndown(html).replace(/\\--/g, '---');

export const normalizeText = (text: string) => (isHTML(text) ? toMarkdown(text) : stripNewlines(text));

// TODO(burdon): Replace legal disclaimers, etc.
export const stripNewlines = (str: string) => {
  const WHITESPACE = /[ \t\u00A0]*\n[ \t\u00A0]*\n[\s\u00A0]*/g;
  return str.trim().replace(WHITESPACE, '\n\n');
};

// TODO(burdon): Reconcile with @dxos/util.
export const createUrl = (parts: (string | undefined)[], params: Record<string, any> = {}): URL => {
  const url = new URL(parts.filter(Boolean).join('/'));
  Object.entries(params)
    .filter(([_, value]) => value != null)
    .forEach(([key, value]) => url.searchParams.set(key, value));

  return url;
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
