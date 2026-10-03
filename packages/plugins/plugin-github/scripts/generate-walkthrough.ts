//
// Copyright 2026 DXOS.org
//

import Anthropic from '@anthropic-ai/sdk';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { fillWalkthrough } from '../src/walkthrough/fill.ts';
import { isGeneratedFile } from '../src/walkthrough/generated.ts';
import { parsePatch } from '../src/walkthrough/patch.ts';
import {
  CHAPTER_SYSTEM_PROMPT,
  PLANNER_SYSTEM_PROMPT,
  assembleWalkthrough,
  buildChapterPrompt,
  buildPlannerPrompt,
  chapterDiff,
  parsePlan,
} from '../src/walkthrough/plan.ts';
import { SYSTEM_PROMPT, buildPrompt } from '../src/walkthrough/prompt.ts';

/**
 * Generates walkthroughs for the eval corpus against the real model.
 *
 *   DX_ANTHROPIC_API_KEY=… node --experimental-strip-types scripts/generate-walkthrough.ts \
 *     evals/walkthrough/13288-large --mode=chaptered
 *
 * The same code paths the operation uses, minus ECHO and GitHub: the prompts, the plan, and the
 * fill. What it adds is the model call, so an eval measures what ships rather than what a subagent
 * would have written.
 */

/** The model the operation pins today, so a scored run matches what a reviewer would receive. */
const DEFAULT_MODEL = 'claude-sonnet-5';

const ask = async (client: Anthropic, model: string, prompt: string): Promise<{ text: string; tokens: number }> => {
  const response = await client.messages
    .stream({ model, max_tokens: 16_000, messages: [{ role: 'user', content: prompt }] })
    .finalMessage();
  if (response.stop_reason === 'refusal') {
    throw new Error(`Refused: ${JSON.stringify(response.stop_details)}`);
  }

  return {
    text: response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join(''),
    tokens: response.usage.input_tokens + response.usage.output_tokens,
  };
};

const oneShot = async (
  client: Anthropic,
  model: string,
  facts: Parameters<typeof buildPlannerPrompt>[0] & { baseBranch?: string; headBranch?: string },
  diff: string,
): Promise<{ body: string; tokens: number; calls: number }> => {
  const { text, tokens } = await ask(client, model, `${SYSTEM_PROMPT}\n\n---\n\n${buildPrompt({ ...facts, diff })}`);
  return { body: text, tokens, calls: 1 };
};

const chaptered = async (
  client: Anthropic,
  model: string,
  facts: Parameters<typeof buildPlannerPrompt>[0],
  diff: string,
): Promise<{ body: string; tokens: number; calls: number }> => {
  const files = parsePatch(diff).filter((file) => !isGeneratedFile(file));
  const planned = await ask(client, model, `${PLANNER_SYSTEM_PROMPT}\n\n---\n\n${buildPlannerPrompt(facts, diff)}`);
  const plan = parsePlan(
    planned.text,
    files.map((file) => file.path),
  );
  if (!plan) {
    throw new Error('Planner produced no readable plan');
  }

  console.log(`  plan: ${plan.chapters.map((chapter) => `${chapter.title} (${chapter.files.length})`).join(', ')}`);
  let tokens = planned.tokens;
  const bodies: string[] = [];
  for (const chapter of plan.chapters) {
    const written = await ask(
      client,
      model,
      `${CHAPTER_SYSTEM_PROMPT}\n\n---\n\n${buildChapterPrompt(plan, chapter, chapterDiff(files, chapter))}`,
    );
    tokens += written.tokens;
    bodies.push(written.text);
  }

  return { body: assembleWalkthrough(plan, bodies), tokens, calls: plan.chapters.length + 1 };
};

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const flags = args.filter((argument) => argument.startsWith('--'));
  const [root] = args.filter((argument) => !argument.startsWith('--'));
  const apiKey = process.env.DX_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!root || !apiKey) {
    console.error('usage: DX_ANTHROPIC_API_KEY=… generate-walkthrough.ts <fixture|corpus> [--mode=…] [--model=…]');
    process.exit(2);
  }

  const model = flags.find((flag) => flag.startsWith('--model='))?.slice('--model='.length) ?? DEFAULT_MODEL;
  const mode = flags.find((flag) => flag.startsWith('--mode='))?.slice('--mode='.length) ?? 'one-shot';
  const out = flags.find((flag) => flag.startsWith('--out='))?.slice('--out='.length) ?? mode;
  const client = new Anthropic({ apiKey });
  const fixtures = statSync(join(root, 'diff.patch'), { throwIfNoEntry: false })
    ? [root]
    : readdirSync(root)
        .map((entry) => join(root, entry))
        .filter((entry) => statSync(entry).isDirectory());

  for (const fixture of fixtures) {
    const diff = readFileSync(join(fixture, 'diff.patch'), 'utf8');
    const title = readFileSync(join(fixture, 'title.txt'), 'utf8').trim();
    const facts = {
      owner: 'dxos',
      repo: 'dxos',
      number: Number(title.match(/#(\d+)/)?.[1] ?? 0),
      title: title.replace(/\s*\(#\d+\)$/, ''),
    };

    console.log(`${fixture} (${mode}, ${diff.length} chars)`);
    const started = Date.now();
    const written =
      mode === 'chaptered' ? await chaptered(client, model, facts, diff) : await oneShot(client, model, facts, diff);
    const filled = fillWalkthrough(written.body, diff);
    writeFileSync(join(fixture, `${out}.md`), filled.body.endsWith('\n') ? filled.body : `${filled.body}\n`);
    console.log(
      `  ${written.calls} calls, ${written.tokens} tokens, ${Math.round((Date.now() - started) / 1000)}s, ` +
        `coverage ${filled.covered}/${filled.total}`,
    );
  }
};

await main();
