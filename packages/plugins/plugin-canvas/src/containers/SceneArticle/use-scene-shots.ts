//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo } from 'react';

import { type Timeline } from '@dxos/animation';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import * as Animation from '@dxos/plugin-animator/Animation';
import { type EditorShot } from '@dxos/react-ui-canvas/scene';

/** A timeline as an ECHO draft stores it: the same keys in fresh, writable records. */
const writable = (timeline: Timeline) => ({
  ...timeline,
  tracks: Object.fromEntries(
    Object.entries(timeline.tracks).map(([id, track]) => [
      id,
      {
        ...track,
        keys: track.keys.map(({ easing, ...key }) => ({
          ...key,
          ...(easing === undefined
            ? {}
            : { easing: typeof easing === 'string' ? easing : { bezier: [...easing.bezier] } }),
        })),
      },
    ]),
  ),
});

/**
 * The animator shots staging `stage` across the space's animations, for the editor's Timeline panel, and the writer
 * that keys one; with no shot, a key makes an animation with one shot over the stage (decision 16: one animation system).
 */
export const useSceneShots = (
  stage: Obj.Unknown | undefined,
): { shots: EditorShot[]; onShotChange: (shot: string | undefined, timeline: Timeline) => void } => {
  const db = stage ? Obj.getDatabase(stage) : undefined;
  const animations = useQuery(db, Filter.type(Animation.Animation));
  const staging = useMemo(
    () =>
      animations.flatMap((animation) =>
        animation.shots.flatMap((shot, index) =>
          stage && shot.stage.target === stage ? [{ animation, index, shot }] : [],
        ),
      ),
    [animations, stage],
  );
  const shots = useMemo(
    () =>
      staging.map(({ animation, index, shot }) => ({
        id: shot.id,
        name: `${animation.name ?? 'Animation'} ${index + 1}`,
        timeline: shot.timeline,
      })),
    [staging],
  );
  const onShotChange = useCallback(
    (id: string | undefined, timeline: Timeline) => {
      const found = staging.find(({ shot }) => shot.id === id);
      if (found) {
        Obj.update(found.animation, (animation) => {
          animation.shots[found.index].timeline = writable(timeline);
        });
      } else if (stage && db) {
        const animation = db.add(Animation.make({ stages: [Ref.make(stage)] }));
        Obj.update(animation, (animation) => {
          animation.shots[0].timeline = writable(timeline);
        });
      }
    },
    [staging, stage, db],
  );
  return { shots, onShotChange };
};
