//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

import { type MeterState, initialMeterState, nextMeterState } from '../audio/level.ts';

/** The level of a live input, read from its analyser once a frame; undefined without one. */
export const useLevel = (analyser: AnalyserNode | undefined): MeterState | undefined => {
  const [state, setState] = useState<MeterState>();
  useEffect(() => {
    if (!analyser) {
      setState(undefined);
      return;
    }
    const samples = new Float32Array(analyser.fftSize);
    let current = initialMeterState(performance.now());
    let frame = requestAnimationFrame(function draw() {
      analyser.getFloatTimeDomainData(samples);
      current = nextMeterState(current, samples, performance.now());
      setState(current);
      frame = requestAnimationFrame(draw);
    });
    return () => cancelAnimationFrame(frame);
  }, [analyser]);
  return state;
};
