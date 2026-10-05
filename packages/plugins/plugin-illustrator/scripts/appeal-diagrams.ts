//
// Copyright 2026 DXOS.org
//

//
// Scores diagrams against the rule library (`@dxos/diagram` `rules/DIAGRAM.mdl`): every `code` and `both`
// rule from the scene's geometry (`Appeal`), and with `--judge clef|clef-flash` every `vision` and `both`
// rule by that model looking at the rendered PNG. For `both` rules it reports how well the geometric
// measure tracks the image judge, which is how a code evaluator earns its place in the library.
// Flags: `--layerings down,up,free` (default all three) lays each diagram out once per layering;
// `--objectives default,appeal` instead lets the engine choose among all its candidates under each objective
// (`appeal` is `Appeal.objective()`, `--appeal-weight` its weight), which is how an engine change is judged.
// `--json out.json` and `--png-dir dir` keep the scores and the renders. Clef needs `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.
// Run: `moon run plugin-illustrator:appeal-diagrams -- [--judge clef] /abs/path/x.mmd …`.
//

import * as Effect from 'effect/Effect';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

import { Appeal, Architecture, Mermaid, MermaidEngine, Rules, type Scene, Score } from '@dxos/diagram';
import { EffectEx } from '@dxos/effect';

import { toSvgFile } from '../src/components/SceneSvgFile.tsx';
import { decisionModel, isJudge } from './judges.ts';
import { toPngs } from './render.tsx';

const argument = (flag: string) => {
  const index = process.argv.indexOf(flag);
  return index > 0 ? process.argv[index + 1] : undefined;
};

const objectsOf = (commands: readonly Scene.Command[]) =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

const nameOf = (path: string) =>
  `${basename(dirname(path)) === 'ideas' ? 'ideas' : 'corpus'}-${basename(path, '.mmd')}`;

const mean = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);

const pearson = (pairs: readonly (readonly [number, number])[]) => {
  const [meanA, meanB] = [mean(pairs.map(([first]) => first)), mean(pairs.map(([, second]) => second))];
  const covariance = mean(pairs.map(([first, second]) => (first - meanA) * (second - meanB)));
  const spread = Math.sqrt(
    mean(pairs.map(([first]) => (first - meanA) ** 2)) * mean(pairs.map(([, second]) => (second - meanB) ** 2)),
  );
  return spread ? covariance / spread : 0;
};

type Drawing = {
  name: string;
  /** The layering or objective this drawing was laid out under. */
  variant: string;
  code: Record<string, { score: number; detail: string }>;
  vision: Record<string, number>;
  appeal: number;
};

const judgeName = argument('--judge');
if (judgeName && !isJudge(judgeName)) {
  throw new Error(`Unknown judge ${judgeName}.`);
}

const program = Effect.gen(function* () {
  const paths = process.argv.slice(2).filter((arg) => arg.endsWith('.mmd'));
  const objectives = argument('--objectives')?.split(',');
  const appealWeight = Number(argument('--appeal-weight') ?? 30);
  const variants: { label: string; options: MermaidEngine.CompileOptions }[] = objectives
    ? objectives.map((label) => ({
        label,
        options: label === 'appeal' ? { objective: Appeal.objective(undefined, { weight: appealWeight }) } : {},
      }))
    : (argument('--layerings') ?? 'down,up,free')
        .split(',')
        .filter((value): value is MermaidEngine.Layering => ['down', 'up', 'free'].includes(value))
        .map((layering) => ({ label: layering, options: { layering: [layering] } }));
  const pngDir = argument('--png-dir');
  const visionRules = Appeal.visionRules();

  const drawings = yield* Effect.forEach(
    paths.flatMap((path) => variants.map((variant) => [resolve(path), variant] as const)),
    ([path, { label: variant, options }]) =>
      Effect.gen(function* () {
        const source = readFileSync(path, 'utf8');
        const objects = objectsOf(yield* Effect.promise(() => MermaidEngine.compile(source, options)));
        const code = Object.fromEntries(
          Appeal.measure(objects).map(({ id, score, detail }) => [id, { score, detail }]),
        );
        let vision: Record<string, number> = {};
        if (judgeName && isJudge(judgeName)) {
          const [image] = yield* Effect.promise(() => toPngs([toSvgFile(objects)]));
          if (pngDir) {
            mkdirSync(pngDir, { recursive: true });
            writeFileSync(join(pngDir, `${nameOf(path)}@${variant}.png`), Buffer.from(String(image.data), 'base64'));
          }
          const scores = yield* Score.evaluate([Appeal.judge()], {
            content: Architecture.contentOf(Mermaid.parse(source)),
            images: [image],
          }).pipe(Effect.provide(decisionModel(judgeName)));
          vision = Object.fromEntries(
            visionRules.flatMap(({ id }, index) => (scores[index].error ? [] : [[id, scores[index].score]])),
          );
        }
        const appeal = Appeal.overall(
          Rules.RULES.flatMap((rule) => (code[rule.id] ? [{ ...rule, ...code[rule.id] }] : [])),
        );
        return { name: nameOf(path), variant, code, vision, appeal } satisfies Drawing;
      }),
    { concurrency: 3 },
  );

  console.log(`\nAppeal (weighted code score) per drawing`);
  for (const { name, variant, appeal, vision } of drawings) {
    const tidy = vision['tidy-overall'];
    console.log(
      `  ${`${name}@${variant}`.padEnd(32)} ${appeal.toFixed(3)}${tidy === undefined ? '' : `   clef tidy ${tidy.toFixed(2)}`}`,
    );
  }

  console.log(
    `\nRules — mean code score, mean ${judgeName ?? 'judge'} score, r(code, judge) over ${drawings.length} drawings`,
  );
  for (const rule of Rules.RULES) {
    const codes = drawings.flatMap(({ code }) => (code[rule.id] ? [code[rule.id].score] : []));
    const visions = drawings.flatMap(({ vision }) => (vision[rule.id] === undefined ? [] : [vision[rule.id]]));
    const pairs = drawings.flatMap(({ code, vision }) =>
      code[rule.id] && vision[rule.id] !== undefined ? [[code[rule.id].score, vision[rule.id]] as const] : [],
    );
    console.log(
      [
        `  ${rule.id.padEnd(26)}`,
        `w${String(rule.weight).padEnd(3)}`,
        (codes.length ? mean(codes).toFixed(2) : '—').padEnd(6),
        (visions.length ? mean(visions).toFixed(2) : '—').padEnd(6),
        pairs.length > 2 ? `r ${pearson(pairs).toFixed(2)}` : '',
      ].join(' '),
    );
  }
  if (judgeName) {
    const pairs = drawings.flatMap(({ appeal, vision }) =>
      vision['tidy-overall'] === undefined ? [] : [[appeal, vision['tidy-overall']] as const],
    );
    console.log(
      `\nr(code appeal, ${judgeName} tidy-overall) = ${pearson(pairs).toFixed(2)} over ${pairs.length} drawings`,
    );
  }

  if (objectives) {
    console.log(`\nPer objective: mean code appeal, mean ${judgeName ?? 'judge'} tidy-overall`);
    for (const label of objectives) {
      const chosen = drawings.filter(({ variant }) => variant === label);
      const tidy = chosen.flatMap(({ vision }) =>
        vision['tidy-overall'] === undefined ? [] : [vision['tidy-overall']],
      );
      console.log(
        `  ${label.padEnd(12)} ${mean(chosen.map(({ appeal }) => appeal)).toFixed(3)}   ${tidy.length ? mean(tidy).toFixed(3) : '—'}`,
      );
    }
  }

  const json = argument('--json');
  if (json) {
    writeFileSync(json, JSON.stringify(drawings, null, 2));
  }
});

void EffectEx.runPromise(program);
