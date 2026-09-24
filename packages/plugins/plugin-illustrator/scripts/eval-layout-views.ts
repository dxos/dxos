//
// Copyright 2026 DXOS.org
//

//
// Evaluates the text views of a diagram's layout (`View` in `@dxos/diagram`) that let System One, which
// reads no images, judge a diagram as drawn. Two measures per view:
//   - layout questions whose answers are read off the geometry (is X above Y, do lines cross, which way
//     the arrows run): accuracy against the truth;
//   - the architecture rules (`Architecture.RULES`): distance and correlation to a reference grader
//     that saw the rendered image.
// `--questions out.json` writes the questions for the reference grader; `--reference answers.json` runs
// System One over every view and prints the comparison. Needs `TYPESAFE_API_KEY`.
// Run: `moon run plugin-illustrator:eval-layout-views -- --reference /abs/answers.json /abs/path/x.mmd …`.
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Redacted from 'effect/Redacted';
import * as Schema from 'effect/Schema';
import * as Decision from 'effect/unstable/ai/Decision';
import * as DecisionModel from 'effect/unstable/ai/DecisionModel';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

import { AiModelResolver, AiService } from '@dxos/ai';
import { TypeSafeResolver } from '@dxos/ai/resolvers';
import { Architecture, Diagnostics, Mermaid, MermaidEngine, type Scene, Score, View } from '@dxos/diagram';
import { EffectEx } from '@dxos/effect';

const MODEL = 'ai.typesafe.model.jev.latest';

const objectsOf = (commands: readonly Scene.Command[]) =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

/** Distinguishes same-named diagrams from the corpus, `ideas/` and the drafts. */
const nameOf = (path: string) =>
  `${basename(dirname(path)) === 'ideas' ? 'ideas' : path.includes('-v0') ? 'draft' : 'corpus'}-${basename(path, '.mmd')}`;

// `none-again` repeats `none`, so the table shows how far System One moves between identical calls.
const VIEWS: Record<string, (objects: readonly Scene.WorldObject[]) => string | undefined> = {
  'none': () => undefined,
  'none-again': () => undefined,
  'coordinates': (objects) => View.coordinates(objects),
  'ascii': (objects) => View.ascii(objects),
  'ascii-coarse': (objects) => View.ascii(objects, { column: 12, row: 32 }),
  'rows': (objects) => View.rows(objects),
  'ascii+rows': (objects) => `${View.ascii(objects)}\n\n${View.rows(objects)}`,
};

type Question = {
  key: string;
  type: string;
  question: string;
  /** Present for a choice; absent for a yes/no question answered with a probability. */
  options?: Record<string, string>;
  truth: boolean | string;
};

const center = ({ rect }: View.Box) => ({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 });
const quote = (box: View.Box) => `"${box.label ?? box.ref}"`;

/** Layout questions for one drawing, answered from its geometry; ordered pairs alternate true and false. */
const questionsOf = (objects: readonly Scene.WorldObject[]): Question[] => {
  const { boxes, paths } = View.extract(objects);
  const nodes = boxes.filter(({ frame }) => !frame);
  const pairs = nodes.flatMap((first, index) => nodes.slice(index + 1).map((second) => [first, second] as const));
  // Spread picks across the list so they are not all about the first node.
  const pick = <T>(items: readonly T[], count: number) => {
    const length = Math.min(count, items.length);
    return Array.from({ length }, (_, index) => items[Math.floor((index * items.length) / length)]);
  };
  const questions: Question[] = [];
  const yesNo = (key: string, type: string, question: string, truth: boolean) =>
    questions.push({ key, type, question, truth });

  pick(
    pairs.filter(([first, second]) => Math.abs(center(first).y - center(second).y) >= 48),
    3,
  ).forEach((pair, index) => {
    const [first, second] = index % 2 ? [pair[1], pair[0]] : pair;
    yesNo(
      `above${index}`,
      'above',
      `Is ${quote(first)} drawn higher on the page than ${quote(second)}?`,
      center(first).y < center(second).y,
    );
  });
  pick(
    pairs.filter(([first, second]) => Math.abs(center(first).x - center(second).x) >= 96),
    3,
  ).forEach((pair, index) => {
    const [first, second] = index % 2 ? [pair[1], pair[0]] : pair;
    yesNo(
      `left${index}`,
      'left-of',
      `Is ${quote(first)} drawn to the left of ${quote(second)}?`,
      center(first).x < center(second).x,
    );
  });
  const sameRow = pairs.filter(([first, second]) => Math.abs(center(first).y - center(second).y) < 16);
  const otherRow = pairs.filter(([first, second]) => Math.abs(center(first).y - center(second).y) >= 96);
  [...pick(sameRow, 1), ...pick(otherRow, 1)].forEach(([first, second], index) =>
    yesNo(
      `row${index}`,
      'same-row',
      `Are ${quote(first)} and ${quote(second)} drawn side by side on the same row?`,
      Math.abs(center(first).y - center(second).y) < 16,
    ),
  );
  yesNo(
    'crosses',
    'crossings',
    'Do any two connector lines cross each other in the drawing?',
    Diagnostics.analyze(objects).metrics.crossings > 0,
  );

  const corner = nodes.reduce((best, box) =>
    Math.hypot(box.rect.x, box.rect.y) < Math.hypot(best.rect.x, best.rect.y) ? box : best,
  );
  const spread = pick(nodes, 6);
  const candidates = spread.includes(corner)
    ? spread
    : [
        corner,
        ...pick(
          nodes.filter((box) => box !== corner),
          5,
        ),
      ];
  questions.push({
    key: 'topLeft',
    type: 'top-left',
    question: 'Which of these boxes is drawn closest to the top-left corner of the page?',
    options: Object.fromEntries(candidates.map((box, index) => [`n${index}`, quote(box)])),
    truth: `n${candidates.indexOf(corner)}`,
  });

  const totals = { down: 0, up: 0, right: 0, left: 0 };
  for (const { points } of paths) {
    const [start, end] = [points[0], points[points.length - 1]];
    const [dx, dy] = [end.x - start.x, end.y - start.y];
    totals[Math.abs(dy) >= Math.abs(dx) ? (dy > 0 ? 'down' : 'up') : dx > 0 ? 'right' : 'left']++;
  }
  questions.push({
    key: 'flow',
    type: 'flow',
    question: 'Which way do most arrows point on the page, from their tail to their head?',
    options: {
      down: 'towards the bottom',
      up: 'towards the top',
      right: 'towards the right',
      left: 'towards the left',
    },
    truth: Object.entries(totals).reduce((best, entry) => (entry[1] > best[1] ? entry : best))[0],
  });
  return questions;
};

const LayoutInput = Schema.Struct({
  content: Architecture.Content,
  layout: Schema.optional(Schema.String).annotate({ description: 'A text rendering of the drawn page.' }),
});

const layoutDefinition = (questions: readonly Question[]) =>
  Decision.make({
    input: LayoutInput,
    decisions: Object.fromEntries(
      questions.map(({ key, question, options }) => [
        key,
        options
          ? Decision.classify({ instructions: question, criteria: options })
          : Decision.probability({ instructions: question }),
      ]),
    ),
  });

/** One diagram's answers: a probability per yes/no question or rule, a key per choice. */
type Answers = { rules: Record<string, number>; layout: Record<string, number | string> };
type Diagram = { name: string; objects: Scene.WorldObject[]; content: Architecture.Content; questions: Question[] };

const load = (path: string) =>
  Effect.gen(function* () {
    const source = readFileSync(path, 'utf8');
    const objects = objectsOf(yield* Effect.promise(() => MermaidEngine.compile(source)));
    // No caption: the rendered image has none, so both graders see the same diagram.
    const content = Architecture.contentOf(Mermaid.parse(source));
    return { name: nameOf(path), objects, content, questions: questionsOf(objects) } satisfies Diagram;
  });

const ask = ({ content, objects, questions }: Diagram, render: (typeof VIEWS)[string]) =>
  Effect.gen(function* () {
    const layout = render(objects);
    const [rules, answers] = yield* Effect.all(
      [
        Score.evaluate([Architecture.judge()], { content: { ...content, ...(layout ? { layout } : {}) } }),
        DecisionModel.decide(layoutDefinition(questions), { input: { content, ...(layout ? { layout } : {}) } }),
      ],
      { concurrency: 2 },
    );
    const layoutAnswers: Record<string, number | string> = {};
    for (const [key, answer] of Object.entries(answers.answers)) {
      layoutAnswers[key] = 'probability' in answer ? answer.probability : 'label' in answer ? answer.label : '';
    }
    return {
      rules: Object.fromEntries(
        Architecture.RULES.flatMap(({ key }, index) => (rules[index].error ? [] : [[key, rules[index].score]])),
      ),
      layout: layoutAnswers,
    } satisfies Answers;
  });

const mean = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);

const pearson = (pairs: readonly (readonly [number, number])[]) => {
  const [meanA, meanB] = [mean(pairs.map(([first]) => first)), mean(pairs.map(([, second]) => second))];
  const covariance = mean(pairs.map(([first, second]) => (first - meanA) * (second - meanB)));
  const spread = Math.sqrt(
    mean(pairs.map(([first]) => (first - meanA) ** 2)) * mean(pairs.map(([, second]) => (second - meanB) ** 2)),
  );
  return spread ? covariance / spread : 0;
};

const accuracy = (diagrams: readonly Diagram[], answersOf: (name: string) => Answers | undefined, type?: string) => {
  const outcomes = diagrams.flatMap(({ name, questions }) =>
    questions
      .filter((question) => !type || question.type === type)
      .flatMap(({ key, truth }) => {
        const answer = answersOf(name)?.layout[key];
        if (answer === undefined) {
          return [];
        }
        return [typeof truth === 'boolean' ? Number(answer) > 0.5 === truth : answer === truth];
      }),
  );
  return outcomes.length ? `${Math.round(mean(outcomes.map(Number)) * 100)}%` : '—';
};

const rulesAgreement = (
  diagrams: readonly Diagram[],
  answersOf: (name: string) => Answers | undefined,
  reference: Record<string, Answers>,
  rule?: string,
) => {
  const pairs = diagrams.flatMap(({ name }) =>
    Architecture.RULES.filter(({ key }) => !rule || key === rule).flatMap(({ key }) => {
      const [mine, theirs] = [answersOf(name)?.rules[key], reference[name]?.rules[key]];
      return mine === undefined || theirs === undefined ? [] : [[mine, theirs] as const];
    }),
  );
  return pairs.length
    ? { mae: mean(pairs.map(([mine, theirs]) => Math.abs(mine - theirs))), r: pearson(pairs) }
    : undefined;
};

const decisionModel = AiService.decisionModel(MODEL).pipe(
  Layer.provide(AiModelResolver.buildAiService),
  Layer.provide(
    TypeSafeResolver.make({
      apiKey: Effect.sync(() => Redacted.make(process.env.TYPESAFE_API_KEY ?? '')),
    }),
  ),
  Layer.provide(FetchHttpClient.layer),
);

const argument = (flag: string) => {
  const index = process.argv.indexOf(flag);
  return index > 0 ? process.argv[index + 1] : undefined;
};

const program = Effect.gen(function* () {
  const paths = process.argv.slice(2).filter((arg) => arg.endsWith('.mmd'));
  const diagrams = yield* Effect.forEach(paths, (path) => load(resolve(path)), { concurrency: 4 });

  const questionsFile = argument('--questions');
  if (questionsFile) {
    writeFileSync(
      questionsFile,
      JSON.stringify(
        {
          rules: Architecture.RULES.map(({ key, instructions, criteria }) => ({
            key,
            question: instructions,
            criteria,
          })),
          diagrams: Object.fromEntries(
            diagrams.map(({ name, questions }) => [
              name,
              questions.map(({ key, question, options }) => ({ key, question, ...(options ? { options } : {}) })),
            ]),
          ),
        },
        null,
        2,
      ),
    );
    console.log(`wrote ${diagrams.length} diagrams' questions to ${questionsFile}`);
    return;
  }

  const referenceFile = argument('--reference');
  if (!referenceFile) {
    for (const { name, objects } of diagrams) {
      for (const [view, render] of Object.entries(VIEWS)) {
        console.log(`\n=== ${name} × ${view}\n${render(objects) ?? '(none)'}`);
      }
    }
    return;
  }
  const reference: Record<string, Answers> = JSON.parse(readFileSync(referenceFile, 'utf8'));
  const results = new Map<string, Answers>();
  yield* Effect.forEach(
    diagrams.flatMap((diagram) => Object.entries(VIEWS).map(([view, render]) => ({ diagram, view, render }))),
    ({ diagram, view, render }) =>
      ask(diagram, render).pipe(
        Effect.tap((answers) => Effect.sync(() => results.set(`${view}/${diagram.name}`, answers))),
        Effect.catch((error) =>
          Effect.sync(() =>
            console.error(`${diagram.name} × ${view}: ${error instanceof Error ? error.message : error}`),
          ),
        ),
      ),
    { concurrency: 4 },
  );
  // Never over the reference: its answers are the costly half of the eval.
  const resultsFile = /\.json$/i.test(referenceFile)
    ? referenceFile.replace(/\.json$/i, '.jev.json')
    : `${referenceFile}.jev.json`;
  writeFileSync(resultsFile, JSON.stringify(Object.fromEntries(results), null, 2));

  const graders: [string, (name: string) => Answers | undefined][] = [
    ['reference (image)', (name) => reference[name]],
    ...Object.keys(VIEWS).map((view): [string, (name: string) => Answers | undefined] => [
      `jev ${view}`,
      (name) => results.get(`${view}/${name}`),
    ]),
  ];
  const types = [...new Set(diagrams.flatMap(({ questions }) => questions.map(({ type }) => type)))];
  console.log(`\nLayout questions — accuracy against the geometry, ${diagrams.length} diagrams`);
  console.log(['grader'.padEnd(22), 'all'.padEnd(6), ...types.map((type) => type.padEnd(10))].join(' '));
  for (const [grader, answersOf] of graders) {
    console.log(
      [
        grader.padEnd(22),
        accuracy(diagrams, answersOf).padEnd(6),
        ...types.map((type) => accuracy(diagrams, answersOf, type).padEnd(10)),
      ].join(' '),
    );
  }
  console.log('\nArchitecture rules — mean |jev − reference| and Pearson r over every diagram × rule');
  const rules = Architecture.RULES.map(({ key }) => key);
  console.log(['grader'.padEnd(22), 'all'.padEnd(12), ...rules.map((rule) => rule.slice(0, 12).padEnd(12))].join(' '));
  for (const [grader, answersOf] of graders.slice(1)) {
    const cell = (rule?: string) => {
      const agreement = rulesAgreement(diagrams, answersOf, reference, rule);
      return (agreement ? `${agreement.mae.toFixed(2)} r${agreement.r.toFixed(2)}` : '—').padEnd(12);
    };
    console.log([grader.padEnd(22), cell(), ...rules.map(cell)].join(' '));
  }
});

void EffectEx.runPromise(program.pipe(Effect.provide(decisionModel)));
