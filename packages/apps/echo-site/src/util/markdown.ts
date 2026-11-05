//
// Copyright 2026 DXOS.org
//

import { snippetSource } from './snippets.ts';

const attribute = (tag: string, name: string): string | undefined => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];

/** Drops MDX import lines, keeping the ones a fenced code sample shows to the reader. */
const stripImports = (body: string): string => {
  let opening: string | undefined;
  return body
    .split('\n')
    .filter((line) => {
      const fence = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
      if (fence) {
        const [, marker, rest] = fence;
        if (!opening) {
          opening = marker;
        } else if (marker[0] === opening[0] && marker.length >= opening.length && !rest.trim()) {
          opening = undefined;
        }
        return true;
      }
      return opening !== undefined || !line.startsWith('import ');
    })
    .join('\n');
};

/** Flattens an MDX page to Markdown: imports go, snippet includes become fenced code, components become plain text. */
export const toMarkdown = (title: string, description: string | undefined, body: string): string => {
  const content = stripImports(body)
    .replace(/<Snippet\b[^>]*\/>/g, (tag) => {
      const file = attribute(tag, 'file');
      if (!file) {
        throw new Error(`Snippet without file: ${tag}`);
      }
      return `\`\`\`ts\n${snippetSource(file, attribute(tag, 'region'))}\n\`\`\``;
    })
    .replace(/<SpecCite item="([^"]*)" \/>/g, '[$1]')
    .replace(/<Anatomy[\s\S]*?\/>/g, (tag) =>
      [...tag.matchAll(/code: '([^']*)', label: '([^']*)'/g)]
        .map(([, code, label]) => `- \`${code}\`: ${label}`)
        .join('\n'),
    )
    .replace(/<\/?(Steps|Aside|div)\b[^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n');
  return `# ${title}\n\n${description ? `${description}\n\n` : ''}${content.trim()}\n`;
};
