//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import React, { useCallback, useContext, useMemo, useState } from 'react';

import { type Clock, type ModuleCompiler } from '@dxos/animation';
import { type Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { TimelineBar, useClock } from '@dxos/react-ui-animation';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import { createEffectWorker, effectCompiler } from '#effects';
import { meta } from '#meta';
import {
  type CompiledShot,
  animationDuration,
  compileShot,
  locateShot,
  sampleTimeline,
  screenAt,
  screenSpans,
  shotSpans,
  stageContext,
} from '#model';
import { type Animation, AnimatorCapabilities } from '#types';

import { OverlayLayer } from '../OverlayLayer/index.ts';
import { ScreenLayer } from '../ScreenLayer/index.ts';
import { useEffectFrames } from './use-effect-frames.ts';

export type AnimationPlayerProps = Util.ThemedClassName<{
  animation: Obj.Snapshot<Animation.Animation> | Animation.Animation;
  stages: readonly AnimatorCapabilities.StageDef[];
  clock: Clock;
  /** An edit the stage made at a time in a shot; absent, the stage is shown read-only. */
  onEdit?: (shot: string, t: number, edit: AnimatorCapabilities.StageEdit) => void;
  /** Compiles effect sources; esbuild-wasm by default. */
  compileEffect?: ModuleCompiler;
  /** The worker effects run in; the bundled effect worker by default, in-process when null. */
  createEffectWorker?: (() => Worker) | null;
}>;

/** The same projection as before, by value, so a stage reporting every frame re-renders only on a move. */
const sameProjection = (
  previous: AnimatorCapabilities.StageProjection | undefined,
  next: AnimatorCapabilities.StageProjection,
) => previous !== undefined && JSON.stringify(previous.anchors) === JSON.stringify(next.anchors);

/**
 * Plays an animation: the stage of the shot at the clock's time, sampled at the time in that shot, above the shots and
 * the timeline bar. The clock is the animation's; this view owns its play loop (F-6.1).
 */
export const AnimationPlayer = ({
  classNames,
  animation,
  stages,
  clock,
  onEdit,
  compileEffect = effectCompiler,
  createEffectWorker: createWorker = createEffectWorker,
}: AnimationPlayerProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const registry = useContext(RegistryContext);
  const duration = animationDuration(animation.shots);
  useClock(clock, { duration });
  const time = useAtomValue(clock.time);
  const playing = useAtomValue(clock.playing);
  const spans = useMemo(() => shotSpans(animation.shots), [animation.shots]);
  const located = locateShot(animation.shots, time);
  const shot = located?.shot;

  // The stage object loads through the shot's reference; subscribing re-renders once it resolves.
  useObject(shot?.stage);
  const object = shot?.stage.target;
  const stage = AnimatorCapabilities.findStage(stages, object);
  const compiled = useMemo<CompiledShot | undefined>(() => {
    if (!shot) {
      return undefined;
    }
    try {
      return compileShot(shot, stage && object ? stageContext(stage, object) : undefined);
    } catch {
      // A script that does not compile plays its hand keys; SetScript reports why.
      return compileShot(shot);
    }
  }, [shot, stage, object]);

  const sample = useMemo(
    () => (compiled && located ? sampleTimeline(compiled.timeline, located.local, located.shot.camera) : undefined),
    [compiled, located?.local, located?.shot.camera],
  );
  const keys = useMemo(() => {
    if (!compiled || !located) {
      return [];
    }
    const times = new Set<number>();
    for (const track of Object.values(compiled.timeline.tracks)) {
      for (const key of track.keys) {
        times.add(located.start + key.t);
      }
    }
    return [...times].sort((left, right) => left - right);
  }, [compiled, located?.start]);
  const screen = useMemo(() => (shot ? screenSpans(shot) : []), [shot]);
  const screenFrame = useMemo(() => screenAt(screen, located?.local ?? 0), [screen, located?.local]);
  const effects = useEffectFrames({
    shot,
    compiled,
    stage,
    object,
    t: located?.local ?? 0,
    compile: compileEffect,
    createWorker: createWorker ?? undefined,
  });
  const [projection, setProjection] = useState<AnimatorCapabilities.StageProjection>();
  const handleProjection = useCallback(
    (next: AnimatorCapabilities.StageProjection) =>
      setProjection((previous) => (sameProjection(previous, next) ? previous : next)),
    [],
  );

  const handlePlayingChange = useCallback((next: boolean) => registry.set(clock.playing, next), [registry, clock]);
  const handleTimeChange = useCallback((next: number) => registry.set(clock.time, next), [registry, clock]);
  const handleEdit = useMemo(
    () =>
      onEdit && shot && located
        ? (edit: AnimatorCapabilities.StageEdit) => onEdit(shot.id, located.local, edit)
        : undefined,
    [onEdit, shot, located?.local],
  );

  const StageComponent = stage?.component;
  return (
    <div className={mx('flex flex-col h-full min-h-0', classNames)} data-testid='animator.player'>
      <div className='relative dx-grow overflow-hidden'>
        {!shot ? (
          <Message>{t('no-shots.message')}</Message>
        ) : !object ? (
          <Message>{t('loading-stage.message')}</Message>
        ) : !StageComponent || !sample ? (
          <Message>{t('no-stage.message')}</Message>
        ) : (
          <StageComponent
            stage={object}
            sample={sample}
            effects={effects}
            clock={clock}
            onEdit={handleEdit}
            onProjection={handleProjection}
          />
        )}
        <OverlayLayer frames={effects} projection={projection} />
        {/* Transitions fade through black, as film does, rather than to the surface behind the player. */}
        <div
          className='absolute inset-0 bg-black pointer-events-none'
          style={{ opacity: 1 - (located?.opacity ?? 1) }}
        />
        <ScreenLayer frame={screenFrame} />
      </div>
      {spans.length > 1 && (
        <Toolbar.Root classNames='shrink-0'>
          {spans.map((span) => (
            <Button.Root
              key={span.shot.id}
              variant={span.index === located?.index ? 'primary' : 'ghost'}
              data-testid='animator.shot'
              onClick={() => {
                handlePlayingChange(false);
                handleTimeChange(span.start);
              }}
            >
              {t('shot.label', { index: span.index + 1 })}
            </Button.Root>
          ))}
        </Toolbar.Root>
      )}
      <TimelineBar
        classNames='shrink-0'
        readonly
        time={time}
        duration={duration}
        playing={playing}
        fps={animation.fps}
        keys={keys}
        onPlayingChange={handlePlayingChange}
        onTimeChange={handleTimeChange}
      />
    </div>
  );
};

const Message = ({ children }: { children: string }) => (
  <div className='flex h-full items-center justify-center text-fg-muted'>{children}</div>
);
