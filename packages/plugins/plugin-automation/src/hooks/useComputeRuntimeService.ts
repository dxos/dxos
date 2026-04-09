//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import { use } from 'react';
import { useMemo } from 'react';

import { unwrapExit } from '@dxos/effect';
import { SpaceId } from '@dxos/keys';

import { AutomationCapabilities } from '../types';
import { useComputeRuntime } from './useComputeRuntime';

export const useComputeRuntimeService = <T extends Context.Tag<any, any>>(
  tag: T,
  spaceId?: SpaceId,
): (Context.Tag.Service<T> & AutomationCapabilities.ComputeRuntime) | undefined => {
  const runtime = useComputeRuntime(spaceId);
  if (!runtime) {
    return undefined;
  }
  return unwrapExit(use(useMemo(() => runtime.runPromiseExit(tag), [runtime, tag])));
};
