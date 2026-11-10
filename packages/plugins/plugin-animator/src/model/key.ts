//
// Copyright 2026 DXOS.org
//

//
// What a key path names (PLUGIN.mdl `op Key`): a stage target's property, an effect parameter, or the camera.
//

import { type AnimatableKind, SCRIPT_CAMERA_TARGET, type Timeline, setKey } from '@dxos/animation';
import { type Obj } from '@dxos/echo';

import { type Animation, type AnimatorCapabilities } from '#types';

/** The prefix of an effect parameter's path; its track's target is `effect:<instance>`. */
export const EFFECT_PATH_PREFIX = 'effect';

/** A key path resolved to the track it keys. */
export type KeyTrack =
  | { kind: 'target'; target: string; property: string }
  | { kind: 'effect'; target: string; property: string; instance: string }
  | { kind: 'camera'; target: string; property: string };

/** The track a path names, or undefined when it is not `<target>:<property>`, `effect:<id>:<param>` or `camera:<p>`. */
export const parseKeyPath = (path: string): KeyTrack | undefined => {
  const [head, ...rest] = path.split(':');
  if (!head || rest.length === 0 || rest.some((part) => part.length === 0)) {
    return undefined;
  }
  if (head === EFFECT_PATH_PREFIX) {
    if (rest.length !== 2) {
      return undefined;
    }
    const [instance, property] = rest;
    return { kind: 'effect', target: `${EFFECT_PATH_PREFIX}:${instance}`, property, instance };
  }
  if (rest.length !== 1) {
    return undefined;
  }
  return head === SCRIPT_CAMERA_TARGET
    ? { kind: 'camera', target: SCRIPT_CAMERA_TARGET, property: rest[0] }
    : { kind: 'target', target: head, property: rest[0] };
};

/**
 * Why a key cannot go on `track` in `shot`, or undefined when it can: the stage must list the target and the property
 * as animatable, and an effect parameter's instance must be placed in the shot.
 */
export const keyError = (
  track: KeyTrack,
  shot: Animation.Shot,
  targets: readonly AnimatorCapabilities.StageTarget[] | undefined,
): string | undefined => {
  switch (track.kind) {
    case 'camera':
      return undefined;
    case 'effect':
      return shot.effects.some((effect) => effect.id === track.instance)
        ? undefined
        : `The shot has no effect ${track.instance}.`;
    case 'target': {
      if (!targets) {
        return 'No stage renders the shot.';
      }
      const target = targets.find((target) => target.id === track.target);
      if (!target) {
        return `The stage has no target ${track.target}.`;
      }
      return target.properties.some((property) => property.path === track.property)
        ? undefined
        : `${track.property} of ${track.target} is not animatable.`;
    }
  }
};

/** The kind the stage declares for a target track's property; effect and camera tracks interpolate by value. */
export const keyKind = (
  track: KeyTrack,
  targets: readonly AnimatorCapabilities.StageTarget[] | undefined,
): AnimatableKind | undefined =>
  track.kind === 'target'
    ? targets
        ?.find((target) => target.id === track.target)
        ?.properties.find((property) => property.path === track.property)?.kind
    : undefined;

/**
 * A plain, writable copy of JSON data (a timeline), so what is stored never shares the object's proxies. Not for data
 * holding references, which JSON does not carry.
 */
export const detach = <T>(value: T): Obj.Mutable<T> => JSON.parse(JSON.stringify(value));

/** The number of keys in a timeline. */
export const keyCount = (timeline: Timeline): number =>
  Object.values(timeline.tracks).reduce((total, track) => total + track.keys.length, 0);

/**
 * `timeline` with a stage edit made `t` seconds into the shot written as keys (F-2.5): one per edited property the
 * stage lists as animatable; any other property is left out, since the animator never writes the stage object.
 */
export const keyEdit = (
  timeline: Timeline,
  edit: AnimatorCapabilities.StageEdit,
  t: number,
  targets: readonly AnimatorCapabilities.StageTarget[],
): Timeline => {
  const target = targets.find((target) => target.id === edit.target);
  if (!target) {
    return timeline;
  }
  return Object.entries(edit.values).reduce((current, [path, value]) => {
    const property = target.properties.find((property) => property.path === path);
    return property ? setKey(current, target.id, path, { t, value }, property.kind) : current;
  }, timeline);
};
