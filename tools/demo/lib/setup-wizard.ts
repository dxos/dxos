//
// Copyright 2026 DXOS.org
//

/**
 * Interactive setup wizard. When `.env.demo` is missing or incomplete, prompt
 * for each variable that has no value, with a link to where the user can get
 * it. Writes the final map back to `.env.demo`.
 *
 * Deliberately uses readline (stdlib) rather than prompt-libraries — we want
 * zero deps beyond what the rest of the tool already pulls in.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';

import dotenv from 'dotenv';

type Prompt = {
  readonly key: string;
  readonly title: string;
  readonly link?: string;
  readonly optional?: boolean;
  readonly example?: string;
};

const PROMPTS: readonly Prompt[] = [
  { key: 'ANTHROPIC_API_KEY', title: 'Anthropic API key', link: 'https://console.anthropic.com/settings/keys' },
  {
    key: 'TRELLO_API_KEY',
    title: 'Trello API key',
    link: 'https://trello.com/power-ups/admin  (create a Power-Up if you have none)',
  },
  {
    key: 'TRELLO_API_TOKEN',
    title: 'Trello API token',
    link: 'https://trello.com/1/authorize?key=YOUR_KEY&scope=read,write&name=ComposerDemo&response_type=token',
  },
  { key: 'TRELLO_BOARD_ID', title: 'Trello board short ID', example: 'EBTRKWwy (from the /b/ in the board URL)' },
  { key: 'GRANOLA_API_KEY', title: 'Granola API key', link: 'Granola desktop app → Settings → API', optional: true },
  { key: 'SLACK_BOT_TOKEN', title: 'Slack bot token', link: 'https://api.slack.com/apps → OAuth & Permissions', example: 'xoxb-…' },
  { key: 'SLACK_CHANNELS', title: 'Slack channels to monitor (comma-separated)', example: 'widgets-eng' },
  { key: 'SLACK_NUDGE_CHANNEL', title: 'Slack channel for proactive nudges', example: 'widgets-eng' },
  { key: 'GITHUB_PAT', title: 'GitHub PAT (fine-grained, read PRs)', link: 'https://github.com/settings/tokens', example: 'github_pat_…' },
  { key: 'GITHUB_REPO', title: 'GitHub repo to monitor for merged PRs', example: 'your-org/your-repo' },
];

const PERSONA_DEFAULTS: Record<string, string> = {
  DEMO_PERSONA_NAME: 'Sarah Chen',
  DEMO_PERSONA_EMAIL: 'sarah@acme.example',
  DEMO_ORG_NAME: 'ACME Corp',
  DEMO_FRESH_START: 'false',
  DEMO_LIVE_SLACK: 'false',
  DEMO_OPEN_SLACK_WEB: 'false',
};

export const runSetupWizard = async (envPath: string): Promise<void> => {
  const existing: Record<string, string> = {};
  if (existsSync(envPath)) {
    const parsed = dotenv.parse(readFileSync(envPath));
    Object.assign(existing, parsed);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log('');
  console.log('Setting up .env.demo. Press Enter to keep existing/skip optional.');
  console.log('');
  try {
    for (const prompt of PROMPTS) {
      const existingValue = existing[prompt.key];
      const label = [prompt.title, prompt.optional ? '(optional)' : ''].filter(Boolean).join(' ');
      if (prompt.link) {
        console.log(`  ${label}`);
        console.log(`  source: ${prompt.link}`);
      } else {
        console.log(`  ${label}${prompt.example ? `  (e.g. ${prompt.example})` : ''}`);
      }
      const masked = existingValue ? `${existingValue.slice(0, 4)}…${existingValue.slice(-3)}` : '';
      const answer = (await rl.question(`  ${prompt.key}${existingValue ? ` [${masked}]` : ''} > `)).trim();
      if (answer.length > 0) {
        existing[prompt.key] = answer;
      } else if (!existingValue && !prompt.optional) {
        console.log(`  ↳ left blank — ${prompt.key} will remain unset`);
      }
      console.log('');
    }
  } finally {
    rl.close();
  }

  for (const [key, value] of Object.entries(PERSONA_DEFAULTS)) {
    if (!existing[key]) {
      existing[key] = value;
    }
  }

  const lines: string[] = [];
  lines.push('# Populated by `pnpm demo --setup`. Edit or re-run the wizard as needed.');
  lines.push('');
  for (const [key, value] of Object.entries(existing)) {
    lines.push(`${key}=${value}`);
  }
  writeFileSync(envPath, lines.join('\n') + '\n', { mode: 0o600 });
  console.log(`Wrote ${envPath} (mode 0600).`);
};
