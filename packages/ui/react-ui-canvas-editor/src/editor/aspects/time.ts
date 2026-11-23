//
// Copyright 2026 DXOS.org
//

import { type EditorTime } from './context.ts';
import { type AspectOptions, keep, setChanged } from './host.ts';

/** The Timeline panel: the host's shots, whether the panel shows, and the playhead the view state keeps. */
export const createTimeAspect = <C>({ registry, latest, store }: AspectOptions<C>) => {
  const initial = latest.current.props;
  const shots = keep(initial.shots);
  const visible = keep(initial.timeline ?? false);
  const aspect: EditorTime = {
    atoms: { shots, shot: store.atoms.shot, time: store.atoms.time, playing: store.atoms.playing, visible },
    commands: {
      setShot: store.setShot,
      setTime: store.setTime,
      setPlaying: store.setPlaying,
      // With `onTimelineChange` the host owns whether the panel shows; otherwise this view does.
      setVisible: (next) => {
        const { onTimelineChange } = latest.current.props;
        onTimelineChange ? onTimelineChange(next) : registry.set(visible, next);
      },
      writeShot: (shot, timeline) => latest.current.props.onShotChange?.(shot, timeline),
    },
  };
  const sync = () => {
    const { props } = latest.current;
    setChanged(registry, shots, props.shots);
    props.onTimelineChange && setChanged(registry, visible, props.timeline ?? false);
  };
  return { aspect, sync };
};
