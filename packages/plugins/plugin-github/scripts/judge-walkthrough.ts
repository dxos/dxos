//
// Copyright 2026 DXOS.org
//

import Anthropic from '@anthropic-ai/sdk';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

/**
 * Runs the LLM judge over blind walkthrough packets.
 *
 *   DX_ANTHROPIC_API_KEY=… node --experimental-strip-types scripts/judge-walkthrough.ts evals/judge
 *
 * A packet is a directory of fixture folders, each holding `diff.patch` and one `<letter>.md` per
 * anonymised variant (see `judge-packet.ts prepare`). One request per fixture grades every document
 * in it together, because the rubric asks for a ranking and a judge that sees one document alone
 * has nothing to rank it against.
 */

/** The dimensions, their order, and what each one asks. Sent to the model and validated against. */
const DIMENSIONS = ['order', 'why', 'load', 'trust'] as const;

const FALLBACK_RUBRIC = [
  'Grade each document 1-5 on four dimensions. Write the reason first, then the number, so the',
  'number is the conclusion of an argument rather than a first impression.',
  '',
  '1. order — does each section build on the last, core of the change first? File-sort order is 1.',
  '2. why — does the prose give the constraint, the failure avoided, the alternative rejected?',
  '   Prose that narrates what the diff already shows is 1.',
  '3. load — could a reviewer who has not seen this code follow it in one pass?',
  '4. trust — does anything read as invented: a motive the diff cannot support, a number with no',
  '   source, a symbol the patch never shows? Nothing invented is 5.',
].join('\n');

const SYSTEM_PROMPT = [
  'You are an impartial judge in an eval harness. You grade walkthroughs: generated documents that',
  'take a code reviewer through a pull request in place of the raw diff.',
  '',
  'Empty fenced blocks like ```diff file=path lines=10-20``` are correct. A postprocess fills them',
  'from the real patch, so grade the document as if the named hunk were shown there.',
  '',
  'The documents are anonymous and their order means nothing. Verify every factual claim against the',
  'patch rather than accepting it. Be discriminating: documents that differ in quality must differ in',
  'score.',
].join('\n');

/** One document's marks. `reasons` is the half of the output a prompt gets fixed from. */
const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verdicts'],
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['document', ...DIMENSIONS, 'reasons'],
        properties: {
          document: { type: 'string', description: 'The document letter, exactly as given.' },
          // An enum rather than a range: structured outputs reject `minimum`/`maximum` on an
          // integer, and the rubric's scale is five fixed marks anyway.
          ...Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, { type: 'integer', enum: [1, 2, 3, 4, 5] }])),
          reasons: {
            type: 'object',
            additionalProperties: false,
            required: [...DIMENSIONS],
            properties: Object.fromEntries(
              DIMENSIONS.map((dimension) => [
                dimension,
                { type: 'string', description: 'One sentence naming a specific passage.' },
              ]),
            ),
          },
        },
      },
    },
  },
};

type Verdict = { document: string } & Record<(typeof DIMENSIONS)[number], number> & {
    reasons: Record<string, string>;
  };

const buildPrompt = (rubric: string, patch: string, documents: { letter: string; body: string }[]): string =>
  [
    rubric,
    '',
    'The patch under review:',
    '',
    '```diff',
    patch,
    '```',
    '',
    ...documents.flatMap(({ letter, body }) => [`Document ${letter}:`, '', '<document>', body, '</document>', '']),
    `Grade documents ${documents.map(({ letter }) => letter).join(', ')}.`,
  ].join('\n');

const judgeFixture = async (
  client: Anthropic,
  model: string,
  rubric: string,
  directory: string,
): Promise<{ verdicts: Verdict[]; inputTokens: number; outputTokens: number }> => {
  const patch = readFileSync(join(directory, 'diff.patch'), 'utf8');
  const documents = readdirSync(directory)
    .filter((file) => file.endsWith('.md') && file !== 'RUBRIC.md')
    .sort()
    .map((file) => ({ letter: basename(file, '.md'), body: readFileSync(join(directory, file), 'utf8') }));

  // Streamed because a judged packet runs long enough to hit the SDK's request timeout otherwise,
  // and thinking is on by default on this model family.
  const response = await client.messages
    .stream({
      model,
      max_tokens: 16_000,
      system: SYSTEM_PROMPT,
      output_config: { effort: 'high', format: { type: 'json_schema', schema: VERDICT_SCHEMA } },
      messages: [{ role: 'user', content: buildPrompt(rubric, patch, documents) }],
    })
    .finalMessage();

  if (response.stop_reason === 'refusal') {
    throw new Error(`Judge refused: ${JSON.stringify(response.stop_details)}`);
  }

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
  const parsed = JSON.parse(text) as { verdicts: Verdict[] };
  const letters = new Set(documents.map(({ letter }) => letter));
  // One verdict per document, first wins: the model sometimes repeats a letter, and a duplicate
  // would weight that document twice in the mean. A missing one would grade a document silently.
  const byLetter = new Map<string, Verdict>();
  for (const verdict of parsed.verdicts) {
    if (letters.has(verdict.document) && !byLetter.has(verdict.document)) {
      byLetter.set(verdict.document, verdict);
    }
  }
  for (const letter of letters) {
    if (!byLetter.has(letter)) {
      throw new Error(`Judge skipped document ${letter} in ${directory}`);
    }
  }

  return {
    verdicts: [...byLetter.values()],
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
};

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const flags = args.filter((argument) => argument.startsWith('--'));
  const [root] = args.filter((argument) => !argument.startsWith('--'));
  if (!root) {
    console.error('usage: judge-walkthrough.ts <packet-root> [--force] [--model=<id>]');
    process.exit(2);
  }

  const apiKey = process.env.DX_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('DX_ANTHROPIC_API_KEY is not set.');
    process.exit(2);
  }

  const model = flags.find((flag) => flag.startsWith('--model='))?.slice('--model='.length) ?? 'claude-opus-5';
  const force = flags.includes('--force');
  const rubricPath = join(root, 'RUBRIC.md');
  const rubric = existsSync(rubricPath) ? readFileSync(rubricPath, 'utf8') : FALLBACK_RUBRIC;
  const client = new Anthropic({ apiKey });

  const fixtures = readdirSync(root).filter((entry) => statSync(join(root, entry)).isDirectory());
  let inputTokens = 0;
  let outputTokens = 0;
  // Serial: four requests is not worth a scheduler, and a rate-limit retry storm would cost more
  // wall clock than the requests it overlapped.
  for (const fixture of fixtures) {
    const directory = join(root, fixture);
    const out = join(directory, 'verdict.json');
    if (existsSync(out) && !force) {
      console.log(`${fixture}: verdict exists, skipping`);
      continue;
    }

    const result = await judgeFixture(client, model, rubric, directory);
    inputTokens += result.inputTokens;
    outputTokens += result.outputTokens;
    writeFileSync(
      out,
      JSON.stringify(
        Object.fromEntries(result.verdicts.map(({ document, reasons, ...marks }) => [document, { ...marks, reasons }])),
        null,
        2,
      ) + '\n',
    );
    console.log(
      `${fixture}: ${result.verdicts.map((verdict) => `${verdict.document}=${DIMENSIONS.map((dimension) => verdict[dimension]).join('/')}`).join(' ')}`,
    );
  }

  console.log(`\nmodel ${model}: ${inputTokens} input tokens, ${outputTokens} output tokens`);
};

await main();
