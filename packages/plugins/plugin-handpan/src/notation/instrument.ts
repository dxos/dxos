//
// Copyright 2026 DXOS.org
//

import type * as Instrument from '@dxos/plugin-sequencer/Instrument';

import { A4, Calibration, type Scale, type ScaleNote, formatPitch, getScaleNotes, parsePitch } from '#audio';

/** The handpan scale as an instrument tuning (MIDI pitches; the ding is the root). */
export const scaleToTuning = (scale: Scale): Instrument.Tuning => ({
  name: scale.name,
  root: scale.ding !== undefined ? parsePitch(scale.ding) : undefined,
  pitches: scale.notes.map(parsePitch),
});

/** A scale for an instrument's tuning; pitch names use flats. */
export const tuningToScale = (tuning: Instrument.Tuning, id = tuning.name ?? 'instrument'): Scale => ({
  id,
  name: tuning.name ?? id,
  ding: tuning.root !== undefined ? formatPitch(tuning.root) : undefined,
  notes: tuning.pitches.map((pitch) => formatPitch(pitch)),
});

/** The recorded strikes of a calibration, per note, as stored on an instrument. */
export const toInstrumentCalibration = (state: Calibration.CalibrationState): Instrument.NoteCalibration[] =>
  state.notes.flatMap(({ pitch, midi }) => {
    const samples = state.samples[pitch];
    return samples?.length
      ? [
          {
            pitch: midi,
            strikes: samples.map(({ frequency, partials, peaks }) => ({
              frequency,
              partials: [...partials],
              peaks: peaks?.map(({ frequency, amplitude }) => ({ frequency, amplitude })),
            })),
          },
        ]
      : [];
  });

/**
 * Restores a calibration from an instrument's stored strikes. Notes are matched by MIDI pitch, so
 * spelling differences (C#4 / Db4) between the scale and the instrument do not matter.
 */
export const fromInstrumentCalibration = (
  notes: ScaleNote[],
  calibration: readonly Instrument.NoteCalibration[],
  options?: { strikes?: number },
): Calibration.CalibrationState => {
  const samples = Object.fromEntries(
    calibration.flatMap(({ pitch, strikes }) => {
      const note = notes.find(({ midi }) => midi === pitch);
      return note
        ? [
            [
              note.pitch,
              strikes.map(({ frequency, partials, peaks }) => ({
                frequency,
                partials: [...partials],
                peaks: peaks?.map((peak) => ({ ...peak })),
              })),
            ],
          ]
        : [];
    }),
  );
  return Calibration.restore(notes, samples, options);
};

/** Scale notes for an instrument's tuning at its concert pitch (`Instrument.reference`, A4 in Hz). */
export const instrumentNotes = (tuning: Instrument.Tuning, reference = A4): ScaleNote[] =>
  getScaleNotes(tuningToScale(tuning), reference);
