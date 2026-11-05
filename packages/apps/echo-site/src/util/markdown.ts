//
// Copyright 2026 DXOS.org
//

import { snippetSource } from './snippets.ts';

const attribute = (tag: string, name: string): string | undefined => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];

/** Drops MDX import lines, keeping the ones a fenced code sample shows to the reader. */
const stripImports = (body: string): string => {
  let fenced = false;
  return body
    .split('\n')
    .filter((line) => {
      if (line.trimStart().startsWith('```')) {
        fenced = !fenced;
      }
      return fenced || !line.startsWith('import ');
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
