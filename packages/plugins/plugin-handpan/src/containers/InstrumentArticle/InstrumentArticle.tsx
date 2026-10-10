//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as Instrument from '@dxos/plugin-sequencer/Instrument';

import { type Scale, SCALES } from '#audio';
import { Tuner } from '#components';

import { scaleToTuning, tuningToScale } from '../../notation/index.ts';

export type InstrumentArticleProps = AppSurface.ObjectArticleProps<Instrument.Instrument>;

/** Calibrates an instrument and shows what is played on it; the calibration is stored on the object. */
export const InstrumentArticle = ({ role, subject }: InstrumentArticleProps) => {
  const [instrument] = useObject(subject);

  // The instrument's tuning is offered as a scale; a preset of the same name is reused so its id is stable.
  const { scales, current } = useMemo(() => {
    const tuning = instrument.tuning;
    if (!tuning) {
      return { scales: SCALES, current: SCALES[0] };
    }
    const preset = SCALES.find(({ name }) => name === tuning.name);
    if (preset) {
      return { scales: SCALES, current: preset };
    }
    const custom = tuningToScale(tuning, 'instrument');
    return { scales: [custom, ...SCALES], current: custom };
  }, [instrument.tuning]);

  const handleScaleChange = useCallback(
    (scale: Scale) =>
      Obj.update(subject, (subject) => {
        subject.tuning = scaleToTuning(scale);
      }),
    [subject],
  );

  const handleCalibrationChange = useCallback(
    (calibration: Instrument.NoteCalibration[]) =>
      Obj.update(subject, (subject) => {
        subject.calibration = calibration;
      }),
    [subject],
  );

  return (
    <Tuner
      role={role}
      source='microphone'
      scales={scales}
      defaultScale={current.id}
      reference={instrument.reference}
      calibration={instrument.calibration}
      onCalibrationChange={handleCalibrationChange}
      onScaleChange={handleScaleChange}
    />
  );
};
