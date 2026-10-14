//
// Copyright 2026 DXOS.org
//

import {
  type MandelbrotInput,
  type MandelbrotOutput,
  type MandelbrotParams,
  MandelbrotProcess,
} from '../testing/index.ts';
import { type ProcessContextValue, makeProcessContext } from './process-context.tsx';

export type ComputeContextValue = ProcessContextValue<MandelbrotParams, MandelbrotInput, MandelbrotOutput>;

const { Provider, useProcesses } = makeProcessContext<MandelbrotParams, MandelbrotInput, MandelbrotOutput>({
  name: 'Mandelbrot',
  definition: MandelbrotProcess,
});

/** Shares the Mandelbrot processes between the story's modules. */
export const ComputeProvider = Provider;

export const useCompute = useProcesses;
