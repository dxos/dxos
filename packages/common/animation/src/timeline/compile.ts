//
// Copyright 2026 DXOS.org
//

import { type MdlBlock, MdlSyntaxError, parseMdl } from '@dxos/deus/parser';

import { type Graph, type NetworkTemplate, TemplateError, buildGraph, emptyGraph } from '../model/index.ts';
import { type Diagnostic, type FlowScript, type FlowStep, VIEWS, readFlow } from '../script/index.ts';
import { boundsOf, circlesOf, resolvePose } from './camera.ts';
import { compilePackets } from './packets.ts';
import { matchedPaths, withDescendants } from './select.ts';
import { type CameraPose, type TimedStep, type Timeline } from './types.ts';

export type CompileOptions = { flow?: string; seed?: number };
export type CompileResult = { timeline: Timeline; diagnostics: Diagnostic[] };

const stepLength = (step: FlowStep): number => Math.max(step.camera?.over ?? 0, step.hold);

/** Start and end of every step: after the previous step, with it, or at a pinned time. */
export const schedule = (steps: readonly FlowStep[]): TimedStep[] => {
  let cursor = 0;
  let previousStart = 0;
  return steps.map((step, index) => {
    const start = step.at ?? (step.with ? previousStart : cursor);
    const end = start + stepLength(step);
    previousStart = start;
    cursor = Math.max(cursor, end);
    return { step, index, start, end };
  });
};

const overview = (graph: Graph): CameraPose => {
  const circles = circlesOf(graph, '*');
  const bounds = circles.length > 0 ? boundsOf(circles) : { center: [0, 0] as const, radius: 1000 };
  return { center: bounds.center, extent: bounds.radius * 1.1, tilt: VIEWS.iso.tilt, spin: VIEWS.iso.spin };
};

const emptyTimeline = (graph: Graph): Timeline => ({
  duration: 0,
  graph,
  initialCamera: overview(graph),
  camera: [],
  hidden: [],
  visibility: {},
  props: [],
  captions: [],
  marks: [],
  narration: [],
  packets: [],
  maxTravel: 0,
});

const compileCamera = (timeline: Timeline, timed: TimedStep[], diagnostics: Diagnostic[]): void => {
  let pose = timeline.initialCamera;
  let busyUntil = -Infinity;
  const moves = timed.filter(({ step }) => step.camera !== undefined).sort((a, b) => a.start - b.start);
  for (const { step, start } of moves) {
    const camera = step.camera;
    if (!camera) {
      continue;
    }
    if (start < busyUntil) {
      diagnostics.push({ severity: 'warning', message: 'This camera move overlaps the previous one', step: step.name });
    }
    const keys = camera.path && camera.path.length > 0 ? camera.path : [camera];
    const slice = camera.over / keys.length;
    keys.forEach((key, index) => {
      const view = key.view ?? (index === 0 ? camera.view : undefined);
      const to = resolvePose(timeline.graph, { ...key, view }, pose, (message) =>
        diagnostics.push({ severity: 'error', message, step: step.name }),
      );
      timeline.camera.push({
        start: start + index * slice,
        end: start + (index + 1) * slice,
        ease: camera.ease,
        from: pose,
        to,
      });
      pose = to;
    });
    busyUntil = start + camera.over;
  }
};

const compileVisibility = (timeline: Timeline, timed: TimedStep[], diagnostics: Diagnostic[]): void => {
  const revealed = new Set<string>();
  for (const { step, start } of timed) {
    for (const [specs, visible] of [
      [step.show, true],
      [step.hide, false],
    ] as const) {
      for (const spec of specs) {
        const roots = matchedPaths(timeline.graph, spec.target);
        if (roots.length === 0) {
          diagnostics.push({ severity: 'error', message: `"${spec.target}" matches nothing`, step: step.name });
        }
        roots.forEach((root, index) => {
          const at = start + index * spec.stagger;
          for (const path of spec.exact ? [root] : withDescendants(timeline.graph, root)) {
            (timeline.visibility[path] ??= []).push({ at, visible, transition: spec.transition });
            if (visible) {
              revealed.add(path);
            }
          }
        });
      }
    }
  }
  timeline.hidden = [...revealed].sort();
  for (const events of Object.values(timeline.visibility)) {
    events.sort((a, b) => a.at - b.at);
  }
};

const compileProps = (timeline: Timeline, timed: TimedStep[], diagnostics: Diagnostic[]): void => {
  for (const { step, start } of timed) {
    for (const { selector, prop, value } of step.set) {
      const paths = matchedPaths(timeline.graph, selector);
      if (paths.length === 0) {
        diagnostics.push({ severity: 'error', message: `"${selector}" matches nothing`, step: step.name });
      }
      for (const path of paths) {
        timeline.props.push({ path, prop, value, at: start });
      }
    }
  }
  timeline.props.sort((a, b) => a.at - b.at);
};

const compileText = (timeline: Timeline, timed: TimedStep[]): void => {
  const ordered = [...timed].sort((a, b) => a.start - b.start);
  const captions = ordered.flatMap(({ step, start }) =>
    step.caption === undefined ? [] : [{ text: step.caption, start }],
  );
  timeline.captions = captions.map((caption, index) => ({
    ...caption,
    end: captions[index + 1]?.start ?? timeline.duration,
  }));
  timeline.marks = ordered.flatMap(({ step, start }) =>
    step.mark === undefined ? [] : [{ name: step.mark, at: start }],
  );
  timeline.narration = ordered.flatMap(({ step, start }) =>
    step.narration === undefined ? [] : [{ text: step.narration, at: start }],
  );
};

const findFlow = (source: string, options: CompileOptions, diagnostics: Diagnostic[]): FlowScript | undefined => {
  let blocks: MdlBlock[];
  try {
    blocks = parseMdl(source);
  } catch (error) {
    if (!(error instanceof MdlSyntaxError)) {
      throw error;
    }
    diagnostics.push({ severity: 'error', message: error.message, line: error.line });
    return undefined;
  }
  const block = blocks.find(
    (candidate) => candidate.type === 'flow' && (options.flow === undefined || candidate.id === options.flow),
  );
  if (!block) {
    diagnostics.push({
      severity: 'error',
      message: options.flow === undefined ? 'The source has no flow block' : `No flow "${options.flow}"`,
    });
    return undefined;
  }
  const read = readFlow(block);
  diagnostics.push(...read.diagnostics);
  return read.flow;
};

/** Compiles a flow against a template; never throws for authoring mistakes, which become diagnostics. */
export const compile = (source: string, template: NetworkTemplate, options: CompileOptions = {}): CompileResult => {
  const diagnostics: Diagnostic[] = [];
  const flow = findFlow(source, options, diagnostics);
  const seed = options.seed ?? flow?.seed ?? 0;
  let graph: Graph;
  try {
    graph = buildGraph(template, seed);
  } catch (error) {
    if (!(error instanceof TemplateError)) {
      throw error;
    }
    diagnostics.push({ severity: 'error', message: error.message });
    graph = emptyGraph();
  }
  const timeline = emptyTimeline(graph);
  if (!flow) {
    return { timeline, diagnostics };
  }
  const timed = schedule(flow.steps);
  timeline.duration = timed.reduce((max, { end }) => Math.max(max, end), 0);
  compileCamera(timeline, timed, diagnostics);
  compileVisibility(timeline, timed, diagnostics);
  compileProps(timeline, timed, diagnostics);
  compileText(timeline, timed);
  timeline.packets = compilePackets(graph, timed, timeline.duration, seed, diagnostics);
  timeline.maxTravel = timeline.packets.reduce((max, packet) => Math.max(max, packet.travel), 0);
  return { timeline, diagnostics };
};
