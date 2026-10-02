//
// Copyright 2026 DXOS.org
//

//
// Evaluates how a judge reads a diagram as drawn, and whether that reading picks better layouts. A grader
// is a judge and a view of the page: `jev:ascii+rows` gives Jev, which reads no images, the text views
// (`View` in `@dxos/diagram`); `clef:image` gives Clef the rendered PNG. Every diagram is laid out once per
// layering (`--layerings down,up,free`), and each grader answers three things per drawing:
//   - layout questions whose answers are read off the geometry (is X above Y, do lines cross, which way the
//     arrows run): accuracy against the truth;
//   - the architecture and aesthetic rules (`Architecture.RULES`, `Aesthetics.RULES`): distance and
//     correlation to a reference grader that saw the rendered image;
//   - which layering it would ship (highest mean aesthetic score): how often that is the reference's pick,
//     and how much worse the reference rates it than its own pick.
// `--questions out.json` writes the questions and PNGs for the reference grader; `--reference answers.json`
// runs the graders (`--graders jev:ascii+rows,clef:image`) and prints the comparison. Jev needs
// `TYPESAFE_API_KEY`; Clef needs `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.
// Run: `moon run plugin-illustrator:eval-layout-views -- --reference /abs/answers.json /abs/path/x.mmd …`.
//

import * as Decision from 'effect/ai/Decision';
import * as DecisionModel from 'effect/ai/DecisionModel';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

import {
  Aesthetics,
  Architecture,
  Diagnostics,
  Mermaid,
  MermaidEngine,
  Objective,
  type Scene,
  Score,
  View,
} from '@dxos/diagram';
import { EffectEx } from '@dxos/effect';

import { IMAGE_NOTE, type Judge, decisionModel, isJudge, seesImages } from './judges.ts';
import { toPngs, toSvg } from './render.tsx';

const objectsOf = (commands: readonly Scene.Command[]) =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

/** Distinguishes same-named diagrams from the corpus, `ideas/` and the drafts. */
const nameOf = (path: string) =>
  `${basename(dirname(path)) === 'ideas' ? 'ideas' : path.includes('-v0') ? 'draft' : 'corpus'}-${basename(path, '.mmd')}`;

/** What a grader is shown of the page beside the graph: text in `layout`, and whether the PNG goes too. */
type Rendering = { layout: (objects: readonly Scene.WorldObject[]) => string | undefined; image?: boolean };

const VIEWS: Record<string, Rendering> = {
  'none': { layout: () => undefined },
  'coordinates': { layout: (objects) => View.coordinates(objects) },
  'ascii': { layout: (objects) => View.ascii(objects) },
  'rows': { layout: (objects) => View.rows(objects) },
  'ascii+rows': { layout: (objects) => `${View.ascii(objects)}\n\n${View.rows(objects)}` },
  'coordinates+rows': { layout: (objects) => `${View.coordinates(objects)}\n\n${View.rows(objects)}` },
  'image': { layout: () => IMAGE_NOTE, image: true },
  'image+rows': { layout: (objects) => `${IMAGE_NOTE}\n\n${View.rows(objects)}`, image: true },
};

/** The aesthetic rules as a grader reads them: with the image, they name it instead of the text drawing. */
const aestheticsFor = (view: Rendering): readonly Architecture.Rule[] =>
  view.image ? Aesthetics.IMAGE_RULES : Aesthetics.RULES;

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

/** One drawing's answers: a probability per yes/no question or rule, a key per choice. */
type Answers = { rules: Record<string, number>; layout: Record<string, number | string> };

type Diagram = {
  /** `<source>@<layering>`. */
  name: string;
  source: string;
  layering: MermaidEngine.Layering;
  objects: Scene.WorldObject[];
  content: Architecture.Content;
  questions: Question[];
  /** The layout objective's overall score: what the engine optimizes when no judge is asked. */
  objective: number;
  svg: string;
  png?: DecisionModel.Image;
};

type Grader = { id: string; judge: Judge; view: Rendering };

const parseGrader = (id: string): Grader => {
  const [judge, view] = id.split(':');
  if (!isJudge(judge) || !VIEWS[view]) {
    throw new Error(`Unknown grader ${id}: expected <jev|clef|clef-flash>:<${Object.keys(VIEWS).join('|')}>.`);
  }
  if (VIEWS[view].image && !seesImages(judge)) {
    throw new Error(`${judge} reads no images, so it cannot grade ${view}.`);
  }
  return { id, judge, view: VIEWS[view] };
};

const load = (path: string, layering: MermaidEngine.Layering) =>
  Effect.gen(function* () {
    const source = readFileSync(path, 'utf8');
    const objects = objectsOf(yield* Effect.promise(() => MermaidEngine.compile(source, { layering: [layering] })));
    const objective = yield* Score.evaluate(Score.fromObjective(Objective.DEFAULT), {
      objects,
      report: Diagnostics.analyze(objects),
    });
    const diagram: Diagram = {
      name: `${nameOf(path)}@${layering}`,
      source: nameOf(path),
      layering,
      objects,
      // No caption: the rendered image has none, so every grader sees the same diagram.
      content: Architecture.contentOf(Mermaid.parse(source)),
      questions: questionsOf(objects),
      objective: Score.overall(objective) ?? 0,
      svg: toSvg(objects),
    };
    return diagram;
  });

const ruleKeys = (rules: readonly Architecture.Rule[]) => rules.map(({ key }) => key);

const ask = (diagram: Diagram, { judge, view }: Grader) =>
  Effect.gen(function* () {
    const layout = view.layout(diagram.objects);
    const content = { ...diagram.content, ...(layout ? { layout } : {}) };
    const images = view.image && diagram.png ? [diagram.png] : undefined;
    const aesthetics = aestheticsFor(view);
    const [architecture, looks, answers] = yield* Effect.all(
      [
        Score.evaluate([Architecture.judge()], { content, images }),
        // Without a drawing there is nothing for the aesthetic rules to judge.
        layout ? Score.evaluate([Aesthetics.judge(aesthetics)], { content, images }) : Effect.succeed([]),
        DecisionModel.decide(layoutDefinition(diagram.questions), {
          input: { content, ...(layout ? { layout } : {}) },
          images,
        }),
      ],
      { concurrency: 3 },
    );
    const keys = [...ruleKeys(Architecture.RULES), ...(layout ? ruleKeys(aesthetics) : [])];
    const scores = [...architecture, ...looks];
    const layoutAnswers: Record<string, number | string> = {};
    for (const [key, answer] of Object.entries(answers.answers)) {
      layoutAnswers[key] = 'probability' in answer ? answer.probability : 'label' in answer ? answer.label : '';
    }
    return {
      rules: Object.fromEntries(
        keys.flatMap((key, index) => (scores[index].error ? [] : [[key, scores[index].score]])),
      ),
      layout: layoutAnswers,
    } satisfies Answers;
  }).pipe(Effect.provide(decisionModel(judge)));

const mean = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);

const pearson = (pairs: readonly (readonly [number, number])[]) => {
  const [meanA, meanB] = [mean(pairs.map(([first]) => first)), mean(pairs.map(([, second]) => second))];
  const covariance = mean(pairs.map(([first, second]) => (first - meanA) * (second - meanB)));
  const spread = Math.sqrt(
    mean(pairs.map(([first]) => (first - meanA) ** 2)) * mean(pairs.map(([, second]) => (second - meanB) ** 2)),
  );
  return spread ? covariance / spread : 0;
};

const percent = (outcomes: readonly boolean[]) =>
  outcomes.length ? `${Math.round(mean(outcomes.map(Number)) * 100)}%` : '—';

const accuracy = (diagrams: readonly Diagram[], answersOf: (name: string) => Answers | undefined, type?: string) =>
  percent(
    diagrams.flatMap(({ name, questions }) =>
      questions
        .filter((question) => !type || question.type === type)
        .flatMap(({ key, truth }) => {
          const answer = answersOf(name)?.layout[key];
          if (answer === undefined) {
            return [];
          }
          return [typeof truth === 'boolean' ? Number(answer) > 0.5 === truth : answer === truth];
        }),
    ),
  );

const agreement = (
  diagrams: readonly Diagram[],
  answersOf: (name: string) => Answers | undefined,
  reference: Record<string, Answers>,
  keys: readonly string[],
) => {
  const pairs = diagrams.flatMap(({ name }) =>
    keys.flatMap((key) => {
      const [mine, theirs] = [answersOf(name)?.rules[key], reference[name]?.rules[key]];
      return mine === undefined || theirs === undefined ? [] : [[mine, theirs] as const];
    }),
  );
  return pairs.length
    ? `${mean(pairs.map(([mine, theirs]) => Math.abs(mine - theirs))).toFixed(2)} r${pearson(pairs).toFixed(2)}`
    : '—';
};

const AESTHETICS = ruleKeys(Aesthetics.RULES);
const ARCHITECTURE = ruleKeys(Architecture.RULES);

/** A drawing's mean aesthetic score under one grader; undefined when it judged none. */
const looksOf = (answers: Answers | undefined) => {
  const values = AESTHETICS.flatMap((key) => (answers?.rules[key] === undefined ? [] : [answers.rules[key]]));
  return values.length ? mean(values) : undefined;
};

/**
 * How well a grader picks the layering to ship, against the reference: how often its favourite is the
 * reference's, how often it orders a pair of layerings as the reference does, and how far below the
 * reference's favourite the reference rates the grader's (the regret of shipping its choice).
 */
const selection = (
  diagrams: readonly Diagram[],
  scoreOf: (diagram: Diagram) => number | undefined,
  reference: Record<string, Answers>,
) => {
  const bySource = Map.groupBy(diagrams, ({ source }) => source);
  const [top, pairs, regrets]: [boolean[], boolean[], number[]] = [[], [], []];
  for (const variants of bySource.values()) {
    const scored = variants.flatMap((diagram) => {
      const [mine, theirs] = [scoreOf(diagram), looksOf(reference[diagram.name])];
      return mine === undefined || theirs === undefined ? [] : [{ mine, theirs }];
    });
    if (scored.length < 2) {
      continue;
    }
    const best = (pick: (entry: (typeof scored)[number]) => number) =>
      scored.reduce((winner, entry) => (pick(entry) > pick(winner) ? entry : winner));
    const [mineBest, theirsBest] = [best(({ mine }) => mine), best(({ theirs }) => theirs)];
    top.push(mineBest === theirsBest);
    regrets.push(theirsBest.theirs - mineBest.theirs);
    scored.forEach((first, index) =>
      scored.slice(index + 1).forEach((second) => {
        if (first.theirs !== second.theirs) {
          pairs.push(first.mine > second.mine === first.theirs > second.theirs);
        }
      }),
    );
  }
  return `${percent(top).padEnd(8)} ${percent(pairs).padEnd(8)} ${(regrets.length ? mean(regrets) : 0).toFixed(3)}`;
};

const argument = (flag: string) => {
  const index = process.argv.indexOf(flag);
  return index > 0 ? process.argv[index + 1] : undefined;
};

const DEFAULT_GRADERS = 'jev:ascii+rows,clef:ascii+rows,clef:image,clef:image+rows,clef-flash:image';

const program = Effect.gen(function* () {
  const paths = process.argv.slice(2).filter((arg) => arg.endsWith('.mmd'));
  const layerings = (argument('--layerings') ?? 'down,up,free')
    .split(',')
    .filter((value): value is MermaidEngine.Layering => ['down', 'up', 'free'].includes(value));
  const graders = (argument('--graders') ?? DEFAULT_GRADERS).split(',').map(parseGrader);
  const diagrams = yield* Effect.forEach(
    paths.flatMap((path) => layerings.map((layering) => [resolve(path), layering] as const)),
    ([path, layering]) => load(path, layering),
    { concurrency: 4 },
  );
  const pngs = yield* Effect.promise(() => toPngs(diagrams.map(({ svg }) => svg)));
  diagrams.forEach((diagram, index) => (diagram.png = pngs[index]));

  const questionsFile = argument('--questions');
  if (questionsFile) {
    const imageDir = join(dirname(resolve(questionsFile)), 'images');
    mkdirSync(imageDir, { recursive: true });
    writeFileSync(
      questionsFile,
      JSON.stringify(
        {
          rules: [...Architecture.RULES, ...aestheticsFor(VIEWS.image)].map(({ key, instructions, criteria }) => ({
            key,
            question: instructions,
            criteria,
          })),
          diagrams: Object.fromEntries(
            diagrams.map(({ name, questions, png }) => {
              const image = join(imageDir, `${name}.png`);
              writeFileSync(image, Buffer.from(typeof png?.data === 'string' ? png.data : '', 'base64'));
              return [
                name,
                {
                  image,
                  questions: questions.map(({ key, question, options }) => ({
                    key,
                    question,
                    ...(options ? { options } : {}),
                  })),
                },
              ];
            }),
          ),
        },
        null,
        2,
      ),
    );
    console.log(`wrote ${diagrams.length} drawings' questions to ${questionsFile} and their images to ${imageDir}`);
    return;
  }

  const referenceFile = argument('--reference');
  if (!referenceFile) {
    for (const { name, objects } of diagrams) {
      for (const [view, { layout }] of Object.entries(VIEWS)) {
        console.log(`\n=== ${name} × ${view}\n${layout(objects) ?? '(none)'}`);
      }
    }
    return;
  }
  const reference: Record<string, Answers> = JSON.parse(readFileSync(referenceFile, 'utf8'));
  // Never over the reference: its answers are the costly half of the eval.
  const resultsFile = referenceFile.replace(/(\.json)?$/i, '.graders.json');
  const results = new Map<string, Answers>(
    Object.entries(
      JSON.parse(
        (() => {
          try {
            return readFileSync(resultsFile, 'utf8');
          } catch {
            return '{}';
          }
        })(),
      ),
    ),
  );
  // Answers already on file are reused, so `--graders` can add one grader without re-asking the rest.
  yield* Effect.forEach(
    diagrams.flatMap((diagram) => graders.map((grader) => ({ diagram, grader }))),
    ({ diagram, grader }) =>
      results.has(`${grader.id}/${diagram.name}`)
        ? Effect.void
        : ask(diagram, grader).pipe(
            Effect.tap((answers) => Effect.sync(() => results.set(`${grader.id}/${diagram.name}`, answers))),
            Effect.catch((error) =>
              Effect.sync(() =>
                console.error(`${diagram.name} × ${grader.id}: ${error instanceof Error ? error.message : error}`),
              ),
            ),
          ),
    { concurrency: 4 },
  );
  writeFileSync(resultsFile, JSON.stringify(Object.fromEntries(results), null, 2));

  const columns: [string, (name: string) => Answers | undefined][] = [
    ['reference (image)', (name) => reference[name]],
    ...graders.map(({ id }): [string, (name: string) => Answers | undefined] => [
      id,
      (name) => results.get(`${id}/${name}`),
    ]),
  ];
  const types = [...new Set(diagrams.flatMap(({ questions }) => questions.map(({ type }) => type)))];
  console.log(`\nLayout questions — accuracy against the geometry, ${diagrams.length} drawings`);
  console.log(['grader'.padEnd(22), 'all'.padEnd(6), ...types.map((type) => type.padEnd(10))].join(' '));
  for (const [grader, answersOf] of columns) {
    console.log(
      [
        grader.padEnd(22),
        accuracy(diagrams, answersOf).padEnd(6),
        ...types.map((type) => accuracy(diagrams, answersOf, type).padEnd(10)),
      ].join(' '),
    );
  }

  console.log('\nRules — mean |grader − reference| and Pearson r over every drawing × rule');
  console.log(
    [
      'grader'.padEnd(22),
      'architecture'.padEnd(12),
      'aesthetics'.padEnd(12),
      ...AESTHETICS.map((key) => key.slice(0, 12).padEnd(12)),
    ].join(' '),
  );
  for (const [grader, answersOf] of columns.slice(1)) {
    console.log(
      [
        grader.padEnd(22),
        agreement(diagrams, answersOf, reference, ARCHITECTURE).padEnd(12),
        agreement(diagrams, answersOf, reference, AESTHETICS).padEnd(12),
        ...AESTHETICS.map((key) => agreement(diagrams, answersOf, reference, [key]).padEnd(12)),
      ].join(' '),
    );
  }

  console.log(`\nPicking a layering (${layerings.join(', ')}) by mean aesthetic score, against the reference's pick`);
  console.log(['chooser'.padEnd(22), 'top-1'.padEnd(8), 'pairs'.padEnd(8), 'regret'].join(' '));
  console.log(`${'layout objective'.padEnd(22)} ${selection(diagrams, ({ objective }) => objective, reference)}`);
  for (const { id } of graders) {
    console.log(
      `${id.padEnd(22)} ${selection(diagrams, ({ name }) => looksOf(results.get(`${id}/${name}`)), reference)}`,
    );
  }
});

void EffectEx.runPromise(program);
