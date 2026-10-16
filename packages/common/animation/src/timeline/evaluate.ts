//
// Copyright 2026 DXOS.org
//

import { type PropValue, type Vec2 } from '../model/index.ts';
import { type Path } from '../path.ts';
import { at, clamp, lerp } from '../util.ts';
import { ease, interpolatePose } from './camera.ts';
import { type CameraPose, type CameraSegment, type Packet, type Timeline } from './types.ts';

export const TRANSITION_MS = 600;

export type ItemState = { visible: number; props: Record<string, PropValue> };
export type PacketState = { id: string; position: Vec2; color: string };
export type SceneState = {
  t: number;
  camera: CameraPose;
  networks: Record<Path, ItemState>;
  nodes: Record<Path, ItemState>;
  packets: PacketState[];
  caption?: string;
  mark?: string;
};

const cameraAt = (timeline: Timeline, t: number): CameraPose => {
  let segment: CameraSegment | undefined;
  for (const candidate of timeline.camera) {
    if (candidate.start > t) {
      break;
    }
    segment = candidate;
  }
  if (!segment) {
    return timeline.initialCamera;
  }
  const span = segment.end - segment.start;
  const k = span > 0 ? clamp((t - segment.start) / span, 0, 1) : 1;
  return interpolatePose(segment.from, segment.to, ease(segment.ease, k));
};

const visibilityAt = (timeline: Timeline, hidden: ReadonlySet<Path>, path: Path, t: number): number => {
  const initial = hidden.has(path) ? 0 : 1;
  let from = initial;
  let target = initial;
  let since = 0;
  let animated = false;
  const valueAt = (time: number): number =>
    animated ? lerp(from, target, clamp((time - since) / TRANSITION_MS, 0, 1)) : target;
  for (const event of timeline.visibility[path] ?? []) {
    if (event.at > t) {
      break;
    }
    from = valueAt(event.at);
    target = event.visible ? 1 : 0;
    since = event.at;
    animated = event.transition !== 'none';
  }
  return valueAt(t);
};

const propsAt = (
  timeline: Timeline,
  path: Path,
  base: Record<string, PropValue>,
  t: number,
): Record<string, PropValue> => {
  const props = { ...base };
  for (const event of timeline.props) {
    if (event.at > t) {
      break;
    }
    if (event.path === path) {
      props[event.prop] = event.value;
    }
  }
  return props;
};

/** Index of the first packet spawned at or after `time`. */
const lowerBound = (packets: readonly Packet[], time: number): number => {
  let low = 0;
  let high = packets.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (at(packets, mid).spawn < time) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
};

const pointAlong = (packet: Packet, k: number): Vec2 => {
  const total = at(packet.lengths, packet.lengths.length - 1);
  const distance = k * total;
  for (let index = 1; index < packet.points.length; index++) {
    const end = at(packet.lengths, index);
    if (distance <= end) {
      const start = at(packet.lengths, index - 1);
      const local = end > start ? (distance - start) / (end - start) : 1;
      const a = at(packet.points, index - 1);
      const b = at(packet.points, index);
      return [lerp(a[0], b[0], local), lerp(a[1], b[1], local)];
    }
  }
  return at(packet.points, packet.points.length - 1);
};

/** The complete scene at `time` (clamped to the timeline); a pure function of its inputs. */
export const evaluate = (timeline: Timeline, time: number): SceneState => {
  const t = clamp(time, 0, timeline.duration);
  const hidden = new Set(timeline.hidden);
  const networks: Record<Path, ItemState> = {};
  for (const network of Object.values(timeline.graph.networks)) {
    networks[network.path] = {
      visible: visibilityAt(timeline, hidden, network.path, t),
      props: propsAt(timeline, network.path, network.props, t),
    };
  }
  const nodes: Record<Path, ItemState> = {};
  for (const node of Object.values(timeline.graph.nodes)) {
    nodes[node.path] = {
      visible: visibilityAt(timeline, hidden, node.path, t),
      props: propsAt(timeline, node.path, node.props, t),
    };
  }

  const packets: PacketState[] = [];
  for (let index = lowerBound(timeline.packets, t - timeline.maxTravel); index < timeline.packets.length; index++) {
    const packet = at(timeline.packets, index);
    if (packet.spawn > t) {
      break;
    }
    const elapsed = t - packet.spawn;
    if (packet.travel <= 0 || elapsed >= packet.travel) {
      continue;
    }
    if ((nodes[packet.from]?.visible ?? 0) === 0 || (nodes[packet.to]?.visible ?? 0) === 0) {
      continue;
    }
    packets.push({ id: packet.id, color: packet.color, position: pointAlong(packet, elapsed / packet.travel) });
  }

  const caption = timeline.captions.find(
    ({ start, end }) => start <= t && (t < end || (end === timeline.duration && t === end)),
  )?.text;
  let mark: string | undefined;
  for (const candidate of timeline.marks) {
    if (candidate.at > t) {
      break;
    }
    mark = candidate.name;
  }
  return { t, camera: cameraAt(timeline, t), networks, nodes, packets, caption, mark };
};
