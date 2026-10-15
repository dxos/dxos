//
// Copyright 2026 DXOS.org
//

import { type Graph, type GraphNode, getNetwork, getNode } from '../model/index.ts';
import { type Path } from '../path.ts';
import { type Random, createRandom } from '../random.ts';
import { type Diagnostic } from '../script/index.ts';
import { at } from '../util.ts';
import { findRoute, networkAdjacency, packetPath } from './route.ts';
import { matchedPaths, withDescendants } from './select.ts';
import { type Packet, type TimedStep } from './types.ts';

export const PACKET_COLORS = ['#5f8fae', '#c97c6b', '#6f9a8f', '#b8975c', '#8a7bb0'] as const;

const PEER_CHANCE = 0.35;
const MAX_HOPS = 3;

const nodesUnder = (graph: Graph, selector: string): Path[] => {
  const out = new Set<Path>();
  for (const path of matchedPaths(graph, selector)) {
    for (const candidate of withDescendants(graph, path)) {
      if (graph.nodes[candidate]) {
        out.add(candidate);
      }
    }
  }
  return [...out].sort();
};

const spawnTimes = (start: number, end: number, rate: number | undefined, count: number | undefined): number[] => {
  if (count !== undefined) {
    return Array.from({ length: count }, (_, index) => start + (index * 1000) / (rate ?? 1));
  }
  if (rate === undefined) {
    return [];
  }
  const times: number[] = [];
  for (let time = start; time < end; time += 1000 / rate) {
    times.push(time);
  }
  return times;
};

const makePacket = (
  graph: Graph,
  id: string,
  spawn: number,
  source: GraphNode,
  target: GraphNode,
  route: Path[],
  color: string,
  speed: number,
): Packet => {
  const points = packetPath(graph, source, target, route);
  const lengths = [0];
  for (let index = 1; index < points.length; index++) {
    const a = at(points, index - 1);
    const b = at(points, index);
    lengths.push(at(lengths, index - 1) + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  return {
    id,
    from: source.path,
    to: target.path,
    spawn,
    travel: (at(lengths, lengths.length - 1) / speed) * 1000,
    points,
    lengths,
    color,
  };
};

/** A destination for background traffic: a peer in the same network, or a node a few hops away. */
const wander = (
  graph: Graph,
  adjacency: Record<Path, Path[]>,
  source: GraphNode,
  random: Random,
): { node: GraphNode; route: Path[] } | undefined => {
  const home = getNetwork(graph, source.network);
  const peers = home.nodes.filter((path) => path !== source.path);
  if (peers.length > 0 && random.next() < PEER_CHANCE) {
    return { node: getNode(graph, random.pick(peers)), route: [home.path] };
  }
  const route = [home.path];
  const hops = random.int(1, MAX_HOPS);
  for (let hop = 0; hop < hops; hop++) {
    const options = (adjacency[at(route, route.length - 1)] ?? []).filter((path) => !route.includes(path));
    if (options.length === 0) {
      break;
    }
    route.push(random.pick(options));
  }
  while (route.length > 1 && getNetwork(graph, at(route, route.length - 1)).nodes.length === 0) {
    route.pop();
  }
  const choices = getNetwork(graph, at(route, route.length - 1)).nodes.filter((path) => path !== source.path);
  if (choices.length === 0) {
    return undefined;
  }
  return { node: getNode(graph, random.pick(choices)), route };
};

/** Warns when an emitter's packets start at or after the end of the flow, where nobody sees them. */
const checkTiming = (
  times: readonly number[],
  duration: number,
  verb: string,
  report: (message: string) => void,
): number[] => {
  const visible = times.filter((time) => time < duration);
  if (visible.length === 0) {
    report(`This ${verb} emits no packets before the flow ends`);
  } else if (visible.length < times.length) {
    report(`${times.length - visible.length} of ${times.length} packets start after the flow ends`);
  }
  return visible;
};

/** Every packet the flow emits, sorted by spawn time; each packet draws from its own random fork. */
export const compilePackets = (
  graph: Graph,
  timed: readonly TimedStep[],
  duration: number,
  seed: number,
  diagnostics: Diagnostic[],
): Packet[] => {
  const random = createRandom(seed).fork('packets');
  const adjacency = networkAdjacency(graph);
  const packets: Packet[] = [];
  for (const { step, index, start } of timed) {
    step.send.forEach((send, sendIndex) => {
      const sources = nodesUnder(graph, send.from);
      const targets = nodesUnder(graph, send.to);
      for (const [selector, nodes] of [
        [send.from, sources],
        [send.to, targets],
      ] as const) {
        if (nodes.length === 0) {
          diagnostics.push({ severity: 'error', message: `"${selector}" matches no nodes`, step: step.name });
        }
      }
      if (sources.length === 0 || targets.length === 0) {
        return;
      }
      const end = send.until !== undefined ? start + send.until : duration;
      let warned = false;
      const warn = (message: string): number => diagnostics.push({ severity: 'warning', message, step: step.name });
      checkTiming(spawnTimes(start, end, send.rate, send.count), duration, 'send', warn).forEach((spawn, k) => {
        const local = random.fork(`send:${index}:${sendIndex}:${k}`);
        const source = getNode(graph, local.pick(sources));
        const others = targets.filter((path) => path !== source.path);
        const target = getNode(graph, local.pick(others.length > 0 ? others : targets));
        const route = findRoute(adjacency, source.network, target.network);
        if (!route) {
          if (!warned) {
            diagnostics.push({
              severity: 'warning',
              message: `No route from "${source.path}" to "${target.path}"`,
              step: step.name,
            });
            warned = true;
          }
          return;
        }
        const color = send.color ?? local.pick(PACKET_COLORS);
        packets.push(makePacket(graph, `${index}.s${sendIndex}.${k}`, spawn, source, target, route, color, send.speed));
      });
    });
    step.traffic.forEach((traffic, trafficIndex) => {
      const scope = nodesUnder(graph, traffic.scope);
      if (scope.length === 0) {
        diagnostics.push({ severity: 'error', message: `"${traffic.scope}" matches no nodes`, step: step.name });
        return;
      }
      const end = traffic.until !== undefined ? start + traffic.until : duration;
      const warn = (message: string): number => diagnostics.push({ severity: 'warning', message, step: step.name });
      checkTiming(spawnTimes(start, end, traffic.rate, undefined), duration, 'traffic', warn).forEach((spawn, k) => {
        const local = random.fork(`traffic:${index}:${trafficIndex}:${k}`);
        const source = getNode(graph, local.pick(scope));
        const destination = wander(graph, adjacency, source, local);
        if (destination) {
          packets.push(
            makePacket(
              graph,
              `${index}.t${trafficIndex}.${k}`,
              spawn,
              source,
              destination.node,
              destination.route,
              local.pick(PACKET_COLORS),
              traffic.speed,
            ),
          );
        }
      });
    });
  }
  return packets.sort((a, b) => a.spawn - b.spawn || a.id.localeCompare(b.id));
};
