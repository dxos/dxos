//
// Copyright 2026 DXOS.org
//

import { snippetSource } from './snippets.ts';

const attribute = (tag: string, name: string): string | undefined => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];

/** Flattens an MDX page to Markdown: imports go, snippet includes become fenced code, components become plain text. */
export const toMarkdown = (title: string, description: string | undefined, body: string): string => {
  // MDX imports lead the body, so anything later that looks like one is a code sample.
  const content = body
    .replace(/^(?:\s*import .*\n)+/, '')
    // A snippet inside a list item keeps the item's indent on every line, or the fence ends the item.
    .replace(/^([ \t]*)(<Snippet\b[^>]*\/>)/gm, (_, indent: string, tag: string) => {
      const file = attribute(tag, 'file');
      if (!file) {
        throw new Error(`Snippet without file: ${tag}`);
      }
      return ['```ts', ...snippetSource(file, attribute(tag, 'region')).split('\n'), '```']
        .map((line) => (line ? `${indent}${line}` : line))
        .join('\n');
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
