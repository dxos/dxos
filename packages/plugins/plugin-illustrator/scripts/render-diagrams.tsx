//
// Copyright 2026 DXOS.org
//

//
// Renders the diagram corpus (`docs/diagrams/*.mmd`) headlessly through the SVG variant, writing a
// `.dx.svg` beside each source (the picture, carrying the drawing's ECHO objects and its mermaid source, so it
// opens as an image anywhere and imports back as an editable drawing; `--plain` writes a bare `.svg`), and
// prints the Tier-1 report per diagram. With
// `--scoreboard` it prints the Tier-2 table instead (every flowchart strategy × soft metrics).
// Passing `.mmd` paths renders just those files instead of the corpus; `--layering down` (or a comma list of
// `down`, `up`, `free`) restricts the candidate layerings the engine chooses among.
// Run: `moon run plugin-illustrator:render-diagrams [-- --scoreboard] [-- /abs/path/x.mmd …]` (tsx from source; bun cannot load elkjs).
//

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import { Diagnostics, Mermaid, MermaidEngine, type Scene, SVG_SCHEMA } from '@dxos/diagram';

import { DrawingFile, SvgBuilder } from '#model';
import { Drawing } from '#types';

import { toSvgFile } from '../src/components/SceneSvgFile.tsx';
import { type Reply } from './emit-worker.ts';

const DIAGRAMS = join(dirname(fileURLToPath(import.meta.url)), '../docs/diagrams');

const layeringArg = process.argv[process.argv.indexOf('--layering') + 1];
const LAYERING = process.argv.includes('--layering')
  ? layeringArg.split(',').filter((value): value is MermaidEngine.Layering => ['down', 'up', 'free'].includes(value))
  : undefined;

const PLAIN = process.argv.includes('--plain');

/** The `.dx.svg` for a compiled diagram: the drawing built in memory as the app would store it. */
const toDxSvg = (
  name: string,
  source: string,
  commands: readonly Scene.Command[],
  objects: readonly Scene.WorldObject[],
) => {
  const canvas = Drawing.makeCanvas({ schema: SVG_SCHEMA });
  SvgBuilder.apply(canvas, commands);
  const drawing = Drawing.make({ name, canvas });
  return DrawingFile.toDxSvg(
    toSvgFile(objects),
    DrawingFile.toPayload({ drawing, canvas, source: { language: 'mermaid', text: source } }),
  );
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
    const worker = new Worker(new URL('./emit-worker.ts', import.meta.url));
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

const files = process.argv.slice(2).filter((arg) => arg.endsWith('.mmd'));
const paths =
  files.length > 0
    ? files.map((file) => resolve(file))
    : readdirSync(DIAGRAMS)
        .filter((file) => file.endsWith('.mmd'))
        .sort()
        .map((file) => join(DIAGRAMS, file));
const sources = paths.map((path) => ({
  name: basename(path, '.mmd'),
  source: readFileSync(path, 'utf8'),
  svgPath: path.replace(/\.mmd$/, PLAIN ? '.svg' : '.dx.svg'),
}));

if (process.argv.includes('--scoreboard')) {
  const rows: Record<string, Record<string, string>> = {};
  for (const { name, source } of sources) {
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
  for (const { name, source, svgPath } of sources) {
    const commands = await MermaidEngine.compile(source, {
      emitCandidate,
      ...(LAYERING ? { layering: LAYERING } : {}),
    });
    const objects = objectsOf(commands);
    const report = Diagnostics.analyze(objects);
    writeFileSync(svgPath, PLAIN ? toSvgFile(objects) : toDxSvg(name, source, commands, objects));
    const { crossings, bends, nodes, connectors } = report.metrics;
    console.log(`${name}: ${nodes} nodes, ${connectors} connectors, ${crossings} crossings, ${bends} bends`);
    for (const diagnostic of report.diagnostics) {
      console.log(`  ${diagnostic.severity}: ${diagnostic.message}`);
    }
    failed ||= Diagnostics.errors(report).length > 0;
  }
  process.exitCode = failed ? 1 : 0;
}

await pool.close();
