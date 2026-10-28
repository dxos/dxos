//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type { ComponentType } from 'react';

import type {
  AnimatableKind,
  Arranger,
  Clock,
  EffectStatus,
  Instance3D,
  OverlayItem,
  ScriptProperties,
  Shape2D,
  Vec3,
} from '@dxos/animation';
import * as Capability from '@dxos/app-framework/Capability';
import { Obj } from '@dxos/echo';

import { meta } from '#meta';

import type * as Animation from './Animation.ts';

/** A property of a stage target that a timeline may key. */
export type AnimatableProperty = {
  /** Dot path into the target (`center`, `style.opacity`). */
  path: string;
  kind: AnimatableKind;
};

/** Something in a stage object a track can key: a canvas node, a 3D object. */
export type StageTarget = {
  /** Stage-local id; the animator stores it opaquely (F-2.4). */
  id: string;
  label: string;
  properties: AnimatableProperty[];
  /** The target's resting values by property path, which a script starts from. */
  values: Record<string, unknown>;
};

/** The value of every keyed target property at one time in a shot. */
export type Sample = {
  /** Seconds into the shot. */
  t: number;
  /** Target → property path → value. */
  values: Record<string, Record<string, unknown>>;
  /** Camera property → value, in the shape the stage owns. */
  camera?: Record<string, unknown>;
};

/** What one effect drew at one time, in its renderer's item type (DESIGN.md §6). */
export type EffectFrame = {
  instance: string;
  /** Running, or paused by an error or the step budget, with the reason. */
  status?: EffectStatus;
  /** Mean milliseconds per step over the recent window. */
  stepMs?: number;
} & (
  | { renderer: '2d'; items: Shape2D[] }
  | { renderer: '3d'; items: Instance3D[] }
  | { renderer: 'overlay'; items: OverlayItem[] }
);

/**
 * A target as effects see it, in the stage's coordinates: a 2D stage sets `z` to 0. `radius` is the target's extent
 * from its centre; `opacity` lets an effect fade with its target.
 */
export type BoundObject = { id: string; position: Vec3; radius: number; color?: string; opacity: number };

/** A link between two targets as effects see it: its route as a polyline from `from` to `to`. */
export type BoundLink = { id: string; from: string; to: string; points: Vec3[] };

/** What effects may bind to in a stage at one time: its objects by id and its links. */
export type StageBinding = { objects: Record<string, BoundObject>; links: BoundLink[] };

/** A target projected to the screen: its centre and radius in pixels from the stage element's top left. */
export type ProjectedAnchor = { x: number; y: number; radius: number };

/** Where the stage drew its targets for one time, which overlay effects anchor to. */
export type StageProjection = { t: number; anchors: Record<string, ProjectedAnchor> };

/** A stage edit made at a time, which the animator writes as keys (F-2.5). */
export type StageEdit = {
  target: string;
  /** Property path → new value. */
  values: Record<string, unknown>;
};

export type StageProps = {
  /** The stage object, which the stage renders without writing to it. */
  stage: Obj.Unknown;
  sample: Sample;
  effects: EffectFrame[];
  clock: Clock;
  /** The export handshake: called once the frame for `t` is on screen (DESIGN.md §8). */
  onFrameDrawn?: (t: number) => void;
  /** Reports an edit made at the sample's time; absent while the animation is not editable. */
  onEdit?: (edit: StageEdit) => void;
  /** Reports where the targets are on screen once a frame is drawn, for the overlay layer above the stage. */
  onProjection?: (projection: StageProjection) => void;
};

/** A stage: how one type of stage object is listed, scripted and drawn (DESIGN.md §7). */
export type StageDef = {
  /** The ECHO typename of the stage object. */
  typename: string;
  label: string;
  /** The targets of a stage object and their animatable properties. */
  targets: (stage: Obj.Unknown) => StageTarget[];
  camera?: { kind: '2d' | 'orbit'; values?: (stage: Obj.Unknown) => Record<string, unknown> };
  /** Which effect renderers the stage can draw. */
  renderers: Animation.EffectRenderer[];
  /** Arrangers a script's `layout` may name, by kind (F-3.3). */
  layouts?: Record<string, Arranger>;
  /**
   * The stage's targets and links at a sample, in the stage's coordinates, for effects to bind to. Pure of the view:
   * the animator calls it ahead of time across a shot, and effects read it in a worker.
   */
  bind?: (stage: Obj.Unknown, sample: Sample) => StageBinding;
  /** The property names a script writes, where they differ from `position`, `scale` and `opacity`. */
  scriptProperties?: Partial<ScriptProperties>;
  /** Draws the stage at a time; sampled values apply to a view, never to the object. */
  component: ComponentType<StageProps>;
};

/** Contributed by a plugin that owns objects, one per stage object type (F-4.1). */
export const Stage = Capability.make<StageDef>()(`${meta.profile.key}.capability.stage`);

/** The stage that renders `object`, by its typename. */
export const findStage = (stages: readonly StageDef[], object: Obj.Unknown | undefined): StageDef | undefined => {
  if (!object) {
    return undefined;
  }
  const typename = Obj.getTypename(object);
  return stages.find((stage) => stage.typename === typename);
};
