//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { Model } from '@dxos/ai';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { Diagnostics, SVG_SCHEMA } from '@dxos/diagram';
import { Database, DXN, Ref } from '@dxos/echo';
import * as WorkerSpace from '@dxos/plugin-debug/WorkerSpace';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as DrawingSkill from '@dxos/plugin-illustrator/DrawingSkill';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import * as IllustratorModel from '@dxos/plugin-illustrator/IllustratorModel';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import { trim } from '@dxos/util';

import { findObject } from '../assertions.ts';
import { createEvalRunner } from '../runner.ts';
import * as Scorer from '../Scorer.ts';
import { getDefaultSkills } from '../skills.ts';

//
// The Hello Worker template's first task, on its own: the agent is given the task text the template
// seeds and the Drawing skill the project binds, and must lay the architecture out with the semantic
// diagram language rather than placing boxes itself. Graded by the `Diagnostics` report that gates
// our own layouts, as in `diagram.eval.ts`.
//

const NAME = 'Hello Worker architecture';

/** What the drawing must show, as words that appear in some box: each entry is one component. */
const COMPONENTS: ReadonlyArray<ReadonlyArray<string>> = [
  ['client'],
  ['worker'],
  ['sandbox', 'wrangler'],
  ['cloudflare'],
];

/** The drawing the run produced, analysed once per run and shared by the scorers. */
const architecture = Scorer.shared(
  Effect.gen(function* () {
    const drawing = yield* findObject(Drawing.Drawing, (entry) => entry.name === NAME);
    if (!drawing) {
      return undefined;
    }
    const canvas = yield* Database.load(drawing.canvas);
    const { scene } = IllustratorModel.SvgBuilder.read(canvas);
    const report = Diagnostics.analyze(scene.objects);
    return {
      errors: Diagnostics.errors(report).map(({ message }) => message),
      metrics: report.metrics,
      text: scene.objects
        .filter((object) => object.id !== 'edges')
        .map((object) => JSON.stringify(object).toLowerCase()),
    };
  }),
);

const drawn = (score: (drawing: Effect.Success<typeof architecture>) => Scorer.Result) =>
  architecture.pipe(Effect.map(score));

/** Whether a call ran the named illustrator operation, matched on its key rather than its display name. */
const calls = (operation: string) => (invocation: { operationKey?: string; name: string }) =>
  (invocation.operationKey ?? invocation.name).includes(`illustrator.${operation}`) ||
  invocation.name === `illustrator-${operation}`;

/**
 * The SVG variant, headless. The plugin registers its own only in a browser, since that one also carries the React
 * article; the drawing operations need nothing but the builder.
 */
const HeadlessSvgVariant = Plugin.make(
  Plugin.define(
    Plugin.makeMeta({ key: DXN.make('org.dxos.test.headlessSvgVariant'), name: 'Headless SVG variant' }),
  ).pipe(
    Plugin.addModule({
      id: 'headless-svg-variant',
      activatesOn: ActivationEvents.Startup,
      provides: [IllustratorCapabilities.VariantProvider],
      activate: () =>
        Effect.succeed([
          Capability.contribute(IllustratorCapabilities.VariantProvider, {
            id: SVG_SCHEMA,
            label: 'svg',
            builder: IllustratorModel.SvgBuilder,
          }),
        ]),
    }),
  ),
);

const SCORERS = [
  Scorer.make({
    name: 'drawing-created',
    description: `A drawing named "${NAME}" exists and holds at least one box.`,
    score: drawn((drawing) => (drawing?.text.length ?? 0) > 0),
  }),
  Scorer.make({
    name: 'no-hard-defects',
    description: 'Diagnostics report no errors (overlap, route through a box, label overflow).',
    score: drawn((drawing) => !!drawing && drawing.errors.length === 0),
  }),
  Scorer.toolCalls({
    name: 'laid-out-by-engine',
    description: 'The diagram was drawn with the semantic language, and no box was placed by an edit.',
    score: (invocations) =>
      invocations.some((invocation) => calls('draw')(invocation) && !Scorer.failedCall(invocation)) &&
      !invocations.some(calls('edit')),
  }),
  Scorer.make({
    name: 'components-present',
    description: 'Client, Worker, sandbox (wrangler) and the Cloudflare account each appear (fraction).',
    score: drawn((drawing) => {
      const text = drawing?.text ?? [];
      return (
        COMPONENTS.filter((words) => text.some((box) => words.some((word) => box.includes(word)))).length /
        COMPONENTS.length
      );
    }),
  }),
  Scorer.make({
    name: 'connectors-drawn',
    description: 'At least the three described arrows: deploy, request and response.',
    score: drawn((drawing) => (drawing?.metrics.connectors ?? 0) >= 3),
  }),
];

const task = createEvalRunner({
  instructions: trim`
    The database starts empty and there is no project to file the result on.
    Create a drawing named "${NAME}" using the "${SVG_SCHEMA}" variant, then do this task in it:

    ${WorkerSpace.ARCHITECTURE.description}
  `,
  input: Schema.Unknown,
  output: Schema.Unknown,
  plugins: [IllustratorPlugin.make(), HeadlessSvgVariant()],
  // A function, so each variant builds its own skill objects: the two models run concurrently, each in its own space.
  skills: () => [...getDefaultSkills(), Ref.make(DrawingSkill.make())],
  timeout: 240_000,
  scored: true,
});

/**
 * DeepSeek V4 Pro is the model the Hello Worker demo runs its delegated chats on, served through EDGE with the run's
 * identity; Opus goes to Anthropic directly and needs `DX_ANTHROPIC_API_KEY`.
 */
const MODELS = [Model.claudeOpus5, Model.deepseekV4Pro].map((model) => ({
  name: model.backend,
  input: { model: model.id },
}));

/** `DX_EVAL_MODELS` narrows the variants, comma-separated; unset or empty runs them all. */
const selected = process.env.DX_EVAL_MODELS?.trim()
  ? process.env.DX_EVAL_MODELS.split(',').map((name) => name.trim())
  : undefined;
const VARIANTS = selected ? MODELS.filter(({ name }) => selected.includes(name)) : MODELS;

evalite.each(VARIANTS)('Hello Worker - the architecture task is laid out by the engine, with no defects', {
  data: [{ input: null }],
  task,
  scorers: Scorer.toEvalite(SCORERS),
});
