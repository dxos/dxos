//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import { useMemo } from 'react';

import { useModules } from '@dxos/react-metagraph';

import { frameDefs } from '../frames';
import { FrameDef } from '../registry';
import { useAppState } from './useAppState';

export const defaultFrameId = 'dxos.module.frame.stack';

// prettier-ignore
export const defaultFrames = [
  'dxos.module.frame.stack',
  'dxos.module.frame.presenter',
  'dxos.module.frame.inbox',
  'dxos.module.frame.calendar',
  'dxos.module.frame.contact',
  'dxos.module.frame.file'
  // 'dxos.module.frame.kanban',
  // 'dxos.module.frame.table',
  // 'dxos.module.frame.note',
  // 'dxos.module.frame.sketch',
  // 'dxos.module.frame.chess',
  // 'dxos.module.frame.sandbox',
  // 'dxos.module.frame.maps',
  // 'dxos.module.frame.document',
  // 'dxos.module.frame.task',
  // 'dxos.module.frame.explorer'
];

export type FrameMap = Map<string, FrameDef<any>>;

// TODO(burdon): Active is unsound.
export const useFrames = (): { frames: FrameMap; active: string[] } => {
  const { modules } = useModules({ type: 'dxos:type/frame' });
  const { frames: active = [] } = useAppState()!;
  const frames = useMemo(
    () =>
      modules.reduce((map, module) => {
        const def = frameDefs.find((def) => def.module.id === module.id);
        assert(def);
        map.set(module.id!, def);
        return map;
      }, new Map<string, FrameDef<any>>()),
    [modules]
  );

  return { frames, active };
};
