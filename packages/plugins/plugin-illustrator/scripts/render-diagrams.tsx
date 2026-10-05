//
// Copyright 2026 DXOS.org
//

//
// Renders the diagram corpus (`docs/diagrams/*.mmd`) headlessly through the SVG variant, writing a
// `.dx.svg` beside each source (the picture, carrying the drawing's ECHO objects and its mermaid source, so it
// opens as an image anywhere and imports back as an editable drawing; `--plain` writes a bare `.svg`), and
// prints the Tier-1 report per diagram. With
// `--scoreboard` it prints the Tier-2 table instead (every flowchart strategy × soft metrics).
// Passing `.mmd` or `.dx` (semantic DSL) paths renders just those files instead of the corpus, and writes a
// `.png` beside each so the drawing can be looked at; `--layering down` (or a comma list of `down`, `up`,
// `free`) restricts the candidate layerings the mermaid engine chooses among.
// Run: `moon run plugin-illustrator:render-diagrams [-- --scoreboard] [-- /abs/path/x.dx …]` (vite-node from source; bun cannot load elkjs).
//

import { chromium } from '@playwright/test';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import { Diagnostics, Dsl, Mermaid, MermaidEngine, type Scene } from '@dxos/diagram';
import { EffectEx } from '@dxos/effect';

import { DrawingFile } from '#model';

import { toSvgFile } from '../src/components/SceneSvgFile.tsx';
import { type Reply } from './emit-worker.ts';

const DIAGRAMS = join(dirname(fileURLToPath(import.meta.url)), '../docs/diagrams');

const layeringArg = process.argv[process.argv.indexOf('--layering') + 1];
const LAYERING = process.argv.includes('--layering')
  ? layeringArg.split(',').filter((value): value is MermaidEngine.Layering => ['down', 'up', 'free'].includes(value))
  : undefined;

const PLAIN = process.argv.includes('--plain');

const RAW_LOADER = fileURLToPath(new URL('./raw-loader.mjs', import.meta.url));

/** The `.dx.svg` for a compiled diagram, built in memory as the app would store it; the same input gives the same bytes. */
const toDxSvg = (
  name: string,
  source: DrawingFile.Source,
  commands: readonly Scene.Command[],
  objects: readonly Scene.WorldObject[],
) => {
  const { drawing, canvas } = DrawingFile.makeDrawing({ name, commands, source });
  return DrawingFile.toDxSvg(toSvgFile(objects), DrawingFile.toPayload({ drawing, canvas, source }));
};

/**
 * Routing the candidates is nearly all of the run and each is independent, so they fan out over a
 * worker per core as the engine places them; it still selects among them in generation order, so
 * the output is the same as routing them in turn.
 */
const makeWorkerPool = (size: number) => {
  type Task = {
    job: MermaidEngine.EmitJob;
    resolve: (commands: Scene.Command[]) => void;
    reject: (error: Error) => void;
  };
  const queue: Task[] = [];
  const running = new Map<Worker, Task>();
  const idle: Worker[] = [];
  const dispatch = (worker: Worker) => {
    const task = queue.shift();
    if (task) {
      running.set(worker, task);
      worker.postMessage(task.job);
    } else {
      idle.push(worker);
    }
  };
  const workers = Array.from({ length: size }, () => {
    // The worker runs under plain node, so it loads TypeScript and `?raw` imports through these hooks.
    const worker = new Worker(new URL('./emit-worker.ts', import.meta.url), {
      execArgv: ['--conditions=source', '--import', 'tsx', '--import', RAW_LOADER],
    });
    worker.on('message', (reply: Reply) => {
      const task = running.get(worker);
      running.delete(worker);
      if ('error' in reply) {
        task?.reject(new Error(reply.error));
      } else {
        task?.resolve(reply.commands);
      }
      dispatch(worker);
    });
    // A job's own failure comes back as a reply; this is the worker itself dying, which leaves the
    // pool unable to promise the rest, so everything outstanding fails rather than hanging.
    worker.on('error', (error) => {
      const outstanding = [...running.values(), ...queue.splice(0)];
      running.clear();
      outstanding.forEach((task) => task.reject(error));
    });
    idle.push(worker);
    return worker;
  });
  const emitCandidate = (job: MermaidEngine.EmitJob): Promise<Scene.Command[]> =>
    new Promise((resolve, reject) => {
      queue.push({ job, resolve, reject });
      const worker = idle.pop();
      if (worker) {
        dispatch(worker);
      }
    });
  return { emitCandidate, close: () => Promise.all(workers.map((worker) => worker.terminate())) };
};

const objectsOf = (commands: readonly Scene.Command[]) =>
  commands.flatMap((command) => (command.op === 'upsert-object' ? [command.object] : []));

type Strategy = { id: string; compile: (source: string) => Promise<readonly Scene.Command[]> };

// One core stays with the main thread, which places the candidates while the workers route them.
const pool = makeWorkerPool(Math.max(1, availableParallelism() - 1));
const { emitCandidate } = pool;

const strategies: Strategy[] = [
  { id: 'layered', compile: async (source) => Mermaid.compile(source) },
  { id: 'elk', compile: (source) => MermaidEngine.compile(source, { emitCandidate }) },
];

const SOURCE = /\.(mmd|dx)$/;
const files = process.argv.slice(2).filter((arg) => SOURCE.test(arg));
const paths =
  files.length > 0
    ? files.map((file) => resolve(file))
    : readdirSync(DIAGRAMS)
        .filter((file) => file.endsWith('.mmd'))
        .sort()
        .map((file) => join(DIAGRAMS, file));
const sources = paths.map((path) => ({
  name: basename(path).replace(SOURCE, ''),
  language: path.endsWith('.dx') ? ('dsl' as const) : ('mermaid' as const),
  source: readFileSync(path, 'utf8'),
  svgPath: path.replace(SOURCE, PLAIN ? '.svg' : '.dx.svg'),
}));

/** Lays out one source with its own engine; DSL problems print as diagnostics do, errors failing the run. */
const compileSource = async ({
  language,
  source,
}: (typeof sources)[number]): Promise<{ commands: readonly Scene.Command[]; problems: readonly Dsl.Problem[] }> =>
  language === 'dsl'
    ? EffectEx.runPromise(Dsl.compile(source))
    : {
        commands: await MermaidEngine.compile(source, { emitCandidate, ...(LAYERING ? { layering: LAYERING } : {}) }),
        problems: [],
      };

/** A raster beside the SVG, because a drawing is judged by looking at it and chat and PR bodies want an image. */
const writePng = async (svgs: { svg: string; path: string }[]) => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  for (const { svg, path } of svgs) {
    await page.setContent(svg);
    await page.locator('svg').first().screenshot({ path });
  }
  await browser.close();
};

if (process.argv.includes('--scoreboard')) {
  const rows: Record<string, Record<string, string>> = {};
  for (const { name, source } of sources.filter(({ language }) => language === 'mermaid')) {
    for (const strategy of strategies) {
      const { metrics } = Diagnostics.analyze(objectsOf(await strategy.compile(source)));
      const errors = metrics.overlaps + metrics.routesThroughNodes + metrics.labelOverflows;
      rows[`${name} / ${strategy.id}`] = {
        errors: String(errors),
        crossings: String(metrics.crossings),
        bends: String(metrics.bends),
        area: `${metrics.width}×${metrics.height}`,
      };
    }
  }
  console.table(rows);
} else {
  let failed = false;
  const rendered: { svg: string; path: string }[] = [];
  for (const entry of sources) {
    const { name, language, source, svgPath } = entry;
    const { commands, problems } = await compileSource(entry);
    const objects = objectsOf(commands);
    const report = Diagnostics.analyze(objects);
    const svg = PLAIN ? toSvgFile(objects) : toDxSvg(name, { language, text: source }, commands, objects);
    writeFileSync(svgPath, svg);
    rendered.push({ svg, path: svgPath.replace(/(\.dx)?\.svg$/, '.png') });
    const { crossings, bends, nodes, connectors } = report.metrics;
    console.log(`${name}: ${nodes} nodes, ${connectors} connectors, ${crossings} crossings, ${bends} bends`);
    for (const problem of problems) {
      console.log(`  ${problem.severity}: ${problem.message}`);
    }
    for (const diagnostic of report.diagnostics) {
      console.log(`  ${diagnostic.severity}: ${diagnostic.message}`);
    }
    failed ||= Diagnostics.errors(report).length > 0 || problems.some(({ severity }) => severity === 'error');
  }
  if (files.length > 0) {
    await writePng(rendered);
  }
  process.exitCode = failed ? 1 : 0;
}

await pool.close();
