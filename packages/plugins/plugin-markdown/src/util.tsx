//
// Copyright 2023 DXOS.org
//

import { debounce } from '@dxos/async';
import { Obj } from '@dxos/echo';
import { type TypedObjectSerializer } from '@dxos/plugin-space/types';

import { Markdown } from './types';

/**
 * Checks if an object conforms to the interface needed to render an editor.
 * @deprecated Use Schema.instanceOf(Markdown.Document, data)
 */
// TODO(burdon): Normalize types (from FilesPlugin).
export const isEditorModel = (data: any): data is { id: string; text: string } =>
  data &&
  typeof data === 'object' &&
  'id' in data &&
  typeof data.id === 'string' &&
  'text' in data &&
  typeof data.text === 'string';

export type MarkdownProperties = Record<string, any>;

export const isMarkdownProperties = (data: unknown): data is MarkdownProperties =>
  (Obj.isObject(data) as boolean)
    ? true
    : data && typeof data === 'object'
      ? 'title' in data && typeof data.title === 'string'
      : false;

const nonTitleChars = /[^\w ]/g;

// Lines matching these patterns are skipped.
const skipPatterns = [
  /^!\[/, // Image.
  /^---\s*$/, // Horizontal rule.
  /^```/, // Code block fence.
  /^\s*$/, // Empty or whitespace-only.
];

// Patterns to extract title text (first capture group is used).
const titlePatterns = [
  /^#{1,6}\s+(.+)/, // Heading.
];

/**
 * Extracts a fallback name by scanning lines for the first heading or text fragment.
 */
export const getFallbackName = (content = ''): string => {
  const len = content.length;

  let i = 0;
  while (i < len) {
    // Find end of line.
    let lineEnd = i;
    while (lineEnd < len && content[lineEnd] !== '\n') {
      lineEnd++;
    }

    const line = content.slice(i, lineEnd).trim();
    i = lineEnd + 1;

    // Skip lines matching skip patterns.
    if (skipPatterns.some((pattern) => pattern.test(line))) {
      continue;
    }

    // Check for title patterns.
    for (const pattern of titlePatterns) {
      const match = pattern.exec(line);
      if (match) {
        const text = match[1].replaceAll(nonTitleChars, '').trim();
        if (text.length > 0) {
          return text;
        }
      }
    }

    // Use line as plain text fallback.
    const maxLen = 32;
    const text = line.replaceAll(nonTitleChars, '').trim();
    if (text.length > 0) {
      if (text.length > maxLen) {
        const words = text.split(/\s+/);
        let result = '';
        for (const word of words) {
          const next = result.length === 0 ? word : result + ' ' + word;
          if (next.length > maxLen) {
            break;
          }
          result = next;
        }

        return result + '…';
      }

      return text;
    }
  }

  return '';
};

// TODO(burdon): Option to strip Markdown.
export const getContentSnippet = (content = '') => {
  const abstract = content
    .split('\n')
    .filter((line) => !line.startsWith('!'))
    .filter((line) => line.trim() !== '');

  return abstract.slice(0, 3).join('\n') ?? '';
};

export const setFallbackName = debounce((doc: Markdown.Document, content = '') => {
  const name = getFallbackName(content);
  if (doc.fallbackName !== name) {
    doc.fallbackName = name;
  }
}, 200);

export const serializer: TypedObjectSerializer<Markdown.Document> = {
  serialize: async ({ object }): Promise<string> => {
    const { content } = await object.content.load();
    return JSON.stringify({ name: object.name, fallbackName: object.fallbackName, content });
  },

  deserialize: async ({ content: serialized }) => {
    const { name, fallbackName, content } = JSON.parse(serialized);
    return Markdown.make({ name, fallbackName, content });
  },
};
