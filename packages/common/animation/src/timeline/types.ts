//
// Copyright 2026 DXOS.org
//

import { type Graph, type PropValue, type Vec2 } from '../model/index.ts';
import { type Path } from '../path.ts';
import { type Ease, type FlowStep, type ShowSpec } from '../script/index.ts';

/** `extent` is the world radius visible across the shorter side of the viewport. */
export type CameraPose = { center: Vec2; extent: number; tilt: number; spin: number };

export type CameraSegment = { start: number; end: number; ease: Ease; from: CameraPose; to: CameraPose };

export type VisibilityEvent = { at: number; visible: boolean; transition: ShowSpec['transition'] };

export type PropEvent = { path: Path; prop: string; value: PropValue; at: number };

export type Caption = { text: string; start: number; end: number };

export type Mark = { name: string; at: number };

export type Narration = { text: string; at: number };

/** A packet's path from node to node; `lengths` are cumulative distances along `points`. */
export type Packet = {
  id: string;
  from: Path;
  to: Path;
  spawn: number;
  travel: number;
  points: Vec2[];
  lengths: number[];
  color: string;
};

export type Timeline = {
  duration: number;
  graph: Graph;
  initialCamera: CameraPose;
  camera: CameraSegment[];
  /** Paths that start invisible because a `show` reveals them later. */
  hidden: Path[];
  visibility: Record<Path, VisibilityEvent[]>;
  props: PropEvent[];
  captions: Caption[];
  marks: Mark[];
  narration: Narration[];
  /** Sorted by spawn time. */
  packets: Packet[];
  maxTravel: number;
};

export type TimedStep = { step: FlowStep; index: number; start: number; end: number };
