//
// Copyright 2026 DXOS.org
//

import { SKILLS_URL } from '../utils/agent-skills.ts';
import { snippetSource } from './snippets.ts';

const attribute = (tag: string, name: string): string | undefined => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];

/** Flattens an MDX page to Markdown: imports go, snippet includes become fenced code, components become plain text. */
export const toMarkdown = (title: string, description: string | undefined, body: string): string => {
  // MDX imports lead the body, so anything later that looks like one is a code sample.
  const content = body
    .replace(/^(?:\s*import .*\n)+/, '')
    .replace(/<Snippet\b[^>]*\/>/g, (tag) => {
      const file = attribute(tag, 'file');
      if (!file) {
        throw new Error(`Snippet without file: ${tag}`);
      }
      return `\`\`\`ts\n${snippetSource(file, attribute(tag, 'region'))}\n\`\`\``;
    })
    .replace(/<SpecCite item="([^"]*)" \/>/g, '[$1]')
    .replace(/<AgentPrompt\b[^>]*\/>/g, (tag) => {
      const skill = attribute(tag, 'skill');
      const text = [
        attribute(tag, 'context'),
        skill && `Use the ${skill} skill: ${SKILLS_URL}/${skill}/SKILL.md`,
        attribute(tag, 'prompt'),
      ]
        .filter(Boolean)
        .join('\n\n');
      return `\`\`\`text\n${text}\n\`\`\``;
    })
    .replace(/<Anatomy[\s\S]*?\/>/g, (tag) =>
      [...tag.matchAll(/code: '([^']*)', label: '([^']*)'/g)]
        .map(([, code, label]) => `- \`${code}\`: ${label}`)
        .join('\n'),
    )
    // The live app and its StackBlitz buttons only work in the page.
    .replace(/<(StackBlitzButton|TutorialEmbed)\b[^>]*\/>/g, '')
    .replace(/<\/?(Steps|Aside|Tabs|TabItem|div)\b[^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n');
  return `# ${title}\n\n${description ? `${description}\n\n` : ''}${content.trim()}\n`;
};
