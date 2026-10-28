//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type { ComponentType } from 'react';

import type { AnimatableKind, Arranger, Clock, ScriptProperties } from '@dxos/animation';
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

/** What one effect drew at one time; filled by the effect runtime in Phase 3. */
export type EffectFrame = {
  instance: string;
  renderer: Animation.EffectRenderer;
  items: unknown[];
};

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
