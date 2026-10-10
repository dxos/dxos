//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type * as InstrumentType from '@dxos/plugin-sequencer/Instrument';
import { Oscilloscope } from '@dxos/react-ui-audio';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as Select from '@dxos/react-ui/Select';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Tooltip from '@dxos/react-ui/Tooltip';

import {
  type AnalyzerFrame,
  Calibration,
  type Classification,
  DEFAULT_SENSITIVITY,
  type NoteEvent,
  type Pitch,
  PitchTracker,
  type Scale,
  type ScaleNote,
  SCALES,
  classifyNote,
  formatPitch,
  frequencyToMidi,
  getScaleNotes,
  nominalTemplates,
} from '#audio';
import { type AudioSourceKind, useNoteAnalyzer } from '#hooks';
import { meta } from '#meta';

import { fromInstrumentCalibration, toInstrumentCalibration } from '../../notation/index.ts';
import { HandpanLayout } from '../HandpanLayout/index.ts';
import { LevelMeter } from '../LevelMeter/index.ts';
import { NoteDisplay } from '../NoteDisplay/index.ts';

export type TunerMode = 'calibrate' | 'live';

export type TunerProps = {
  /** `microphone` listens to an instrument; `synth` lets the pads strike synthesized tones. */
  source: AudioSourceKind;
  defaultMode?: TunerMode;
  scales?: Scale[];
  /** Initial scale id; changing it later (e.g. from a story control) switches the tuner to it. */
  defaultScale?: string;
  /** Strikes recorded per note during calibration. */
  strikes?: number;
  /** Maximum random detuning (cents) of synthesized strikes, to exercise the tuning meter. */
  synthDetune?: number;
  /** Start with chord detection on (Live mode): several notes struck together are reported as one chord. */
  chords?: boolean;
  /** Analyze synthesized strikes without playing them (e.g. while a microphone is in use nearby). */
  silent?: boolean;
  /**
   * The instrument's stored calibration (e.g. `Instrument.calibration`). When set, the tuner reads its
   * calibration from here instead of local storage and reports every change through `onCalibrationChange`.
   */
  calibration?: readonly InstrumentType.NoteCalibration[];
  onCalibrationChange?: (calibration: InstrumentType.NoteCalibration[]) => void;
  /** Keep the selected scale and each scale's calibration in this browser (local storage) across reloads. */
  persist?: boolean;
  onNote?: (event: NoteEvent, classification?: Classification) => void;
};

type PlayedNote = {
  event: NoteEvent;
  note?: ScaleNote;
  classification?: Classification;
  /** Every note of the strike when it was a chord (two or more notes). */
  chord?: ScaleNote[];
};

/** Consecutive below-threshold frames (~130 ms) before a held chord is released. */
const CHORD_RELEASE_FRAMES = 12;

/** Partial profile assumed for notes not yet calibrated (fundamental, octave, twelfth). */
const DEFAULT_PARTIALS = [0.59, 0.26, 0.15];

const chordLabel = (chord: ScaleNote[]) => chord.map(({ label }) => label).join('+');

const HISTORY_SIZE = 16;
const STRIKE_LOG_SIZE = 5;

const formatCents = (value: number) => `${Math.round(value) > 0 ? '+' : ''}${Math.round(value) || 0}`;

/** What a strike sounded like, as a scale note if it is one, else a pitch name. */
const describeHeard = (event: NoteEvent, notes: ScaleNote[]): string => {
  if (event.frequency === undefined) {
    return '?';
  }
  const classification = classifyNote({ frequency: event.frequency, partials: [] }, nominalTemplates(notes));
  const note = classification && notes.find((candidate) => candidate.pitch === classification.template.pitch);
  return note ? `${note.label} ${note.pitch}` : formatPitch(frequencyToMidi(event.frequency));
};

const loadNumber = (name: string): number | undefined => {
  try {
    const value = Number(localStorage.getItem(`${meta.profile.key}.${name}`) ?? undefined);
    return Number.isFinite(value) ? value : undefined;
  } catch {
    return undefined;
  }
};

const saveNumber = (name: string, value: number) => {
  try {
    localStorage.setItem(`${meta.profile.key}.${name}`, String(value));
  } catch {
    // Storage unavailable.
  }
};

/** Per-frame decay of the recent peak level (≈8 s half-life at ~90 frames/s), slower than a note's tail. */
const PEAK_DECAY = 0.999;
/** A frame counts as sounding only above this fraction of the recent peak level (−20 dB). */
const RELATIVE_LEVEL = 0.1;
/** Absolute floor (RMS) below which nothing counts as sounding. */
const MIN_LEVEL = 0.002;

const storageKey = (scaleId: string) => `${meta.profile.key}.calibration.${scaleId}`;
const scaleStorageKey = `${meta.profile.key}.scale`;

const loadScaleId = (): string | undefined => {
  try {
    return localStorage.getItem(scaleStorageKey) ?? undefined;
  } catch {
    return undefined;
  }
};

const saveScaleId = (scaleId: string) => {
  try {
    localStorage.setItem(scaleStorageKey, scaleId);
  } catch {
    // Storage unavailable.
  }
};

/** Storage can be unavailable (private windows, blocked site data); calibration then lasts the session. */
const loadSamples = (scaleId: string): Calibration.CalibrationState['samples'] => {
  try {
    return JSON.parse(localStorage.getItem(storageKey(scaleId)) ?? '{}');
  } catch {
    return {};
  }
};

const saveSamples = (scaleId: string, samples: Calibration.CalibrationState['samples']) => {
  try {
    localStorage.setItem(storageKey(scaleId), JSON.stringify(samples));
  } catch {
    // Storage unavailable.
  }
};

/**
 * Calibrates the note detector to an instrument and displays notes as they are played.
 * Pure component: owns its analyzer session, takes no app-framework capabilities.
 */
export const Tuner = ({
  source,
  defaultMode = 'calibrate',
  scales = SCALES,
  defaultScale = scales[0]?.id,
  strikes = 3,
  synthDetune = 15,
  persist = false,
  calibration: storedCalibration,
  onCalibrationChange,
  silent = false,
  chords = false,
  onNote,
}: TunerProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [mode, setMode] = useState<TunerMode>(defaultMode);
  const [chordMode, setChordMode] = useState(chords);
  const [scaleId, setScaleId] = useState(() => {
    const saved = persist ? loadScaleId() : undefined;
    return scales.some((candidate) => candidate.id === saved) ? saved : defaultScale;
  });
  const [played, setPlayed] = useState<PlayedNote[]>([]);

  const scale = scales.find((candidate) => candidate.id === scaleId) ?? scales[0];
  const notes = useMemo(() => getScaleNotes(scale), [scale]);

  // A ref mirrors the calibration because strikes arrive from the audio callback, outside render.
  const controlled = storedCalibration !== undefined;
  const loadCalibration = (scaleNotes: ScaleNote[], scaleId: string) =>
    storedCalibration
      ? fromInstrumentCalibration(scaleNotes, storedCalibration, { strikes })
      : persist
        ? Calibration.restore(scaleNotes, loadSamples(scaleId), { strikes })
        : Calibration.createCalibration(scaleNotes, { strikes });
  const [calibration, setCalibrationState] = useState(() => loadCalibration(notes, scale.id));
  const calibrationRef = useRef(calibration);
  const scaleIdRef = useRef(scale.id);
  scaleIdRef.current = scale.id;
  // What this tuner last reported, so an echo of its own change is not re-applied as an external one.
  const emittedRef = useRef<string>(undefined);
  const setCalibration = useCallback(
    (state: Calibration.CalibrationState) => {
      calibrationRef.current = state;
      setCalibrationState(state);
      if (onCalibrationChange) {
        const stored = toInstrumentCalibration(state);
        emittedRef.current = JSON.stringify(stored);
        onCalibrationChange(stored);
      } else if (persist) {
        saveSamples(scaleIdRef.current, state.samples);
      }
    },
    [persist, onCalibrationChange],
  );

  // Another device or user may update the instrument's calibration.
  useEffect(() => {
    if (storedCalibration && JSON.stringify(storedCalibration) !== emittedRef.current) {
      emittedRef.current = JSON.stringify(storedCalibration);
      const state = fromInstrumentCalibration(calibrationRef.current.notes, storedCalibration, { strikes });
      calibrationRef.current = state;
      setCalibrationState(state);
    }
  }, [storedCalibration, strikes]);
  const [rejection, setRejection] = useState<Calibration.StrikeRejection>();
  const [strikeLog, setStrikeLog] = useState<{ key: number; text: string; accepted: boolean }[]>([]);
  const [gain, setGain] = useState(() => (persist ? loadNumber('gain') : undefined) ?? 0);
  const [sensitivity, setSensitivity] = useState(
    () => (persist ? loadNumber('sensitivity') : undefined) ?? DEFAULT_SENSITIVITY,
  );
  const handleGainChange = (value: number) => {
    setGain(value);
    persist && saveNumber('gain', value);
  };
  const handleSensitivityChange = (value: number) => {
    setSensitivity(value);
    persist && saveNumber('sensitivity', value);
  };

  const templates = useMemo(() => {
    const calibrated = Calibration.getTemplates(calibration);
    const nominal = nominalTemplates(notes).filter(
      (template) => !calibrated.some((candidate) => candidate.pitch === template.pitch),
    );
    return [...calibrated, ...nominal];
  }, [calibration, notes]);
  const templatesRef = useRef(templates);
  templatesRef.current = templates;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Per-frame estimates arrive outside render; the tracker and level live in refs and are read on
  // the re-render the analyzer's frame update already triggers each animation frame.
  const trackerRef = useRef(new PitchTracker<Pitch>());
  // The chord of the latest strike, held while the input stays above the sounding threshold: a mix of
  // notes has no single clear pitch, so the per-frame tracker cannot keep it alive.
  const chordRef = useRef<{ notes: ScaleNote[]; quietFrames: number }>(undefined);
  const peakRmsRef = useRef(0);
  const thresholdRef = useRef(MIN_LEVEL);
  const liveRef = useRef<{ frequency: number; clarity: number }>(undefined);

  const handleFrame = useCallback((frame: AnalyzerFrame) => {
    peakRmsRef.current = Math.max(frame.rms, peakRmsRef.current * PEAK_DECAY);
    // Relative to recent playing, so room noise and a decayed tail do not register as a note.
    thresholdRef.current = Math.max(MIN_LEVEL, peakRmsRef.current * RELATIVE_LEVEL);
    const loud = frame.rms >= thresholdRef.current;
    if (chordRef.current) {
      chordRef.current.quietFrames = loud ? 0 : chordRef.current.quietFrames + 1;
      if (chordRef.current.quietFrames >= CHORD_RELEASE_FRAMES) {
        chordRef.current = undefined;
      }
    }
    const classification =
      loud && frame.frequency !== undefined
        ? classifyNote({ frequency: frame.frequency, partials: [] }, templatesRef.current)
        : undefined;
    const tracked = trackerRef.current.update(
      classification ? { key: classification.template.pitch, cents: classification.cents } : undefined,
    );
    liveRef.current =
      tracked && classification?.template.pitch === tracked.key && frame.frequency !== undefined
        ? { frequency: frame.frequency, clarity: frame.clarity }
        : tracked
          ? liveRef.current
          : undefined;
  }, []);

  const handleNote = useCallback(
    (event: NoteEvent) => {
      if (modeRef.current === 'calibrate') {
        const target = Calibration.getTarget(calibrationRef.current);
        const result = Calibration.addStrike(calibrationRef.current, event);
        setCalibration(result.state);
        setRejection(result.rejected);
        if (target) {
          const heard = describeHeard(event, notes);
          const text = result.rejected
            ? t(`strike-log-${result.rejected}.message`, { heard, expected: `${target.label} ${target.pitch}` })
            : t('strike-log-accepted.message', {
                note: `${target.label} ${target.pitch}`,
                cents: formatCents(result.cents ?? 0),
              });
          setStrikeLog((previous) =>
            [{ key: event.time, text, accepted: !result.rejected }, ...previous].slice(0, STRIKE_LOG_SIZE),
          );
        }
        if (!result.rejected) {
          if (target) {
            trackerRef.current.set({ key: target.pitch, cents: result.cents ?? 0 });
          }
          setPlayed((previous) => [{ event, note: target }, ...previous].slice(0, HISTORY_SIZE));
        }
        onNote?.(event);
        return;
      }

      const classification = event.frequency
        ? classifyNote({ frequency: event.frequency, partials: event.partials }, templatesRef.current)
        : undefined;
      const note = classification && notes.find((candidate) => candidate.pitch === classification.template.pitch);
      if (classification) {
        trackerRef.current.set({ key: classification.template.pitch, cents: classification.cents });
      }
      const chordNotes = notes.filter((candidate) => event.chord?.includes(candidate.pitch));
      const chord = chordNotes && chordNotes.length > 1 ? chordNotes : undefined;
      chordRef.current = chord && { notes: chord, quietFrames: 0 };
      setPlayed((previous) => [{ event, note, classification, chord }, ...previous].slice(0, HISTORY_SIZE));
      onNote?.(event, classification);
    },
    [notes, onNote, setCalibration],
  );

  const chordTemplates = useMemo(
    () =>
      chordMode && mode === 'live'
        ? templates.map((template) => ({
            ...template,
            partials: template.partials.length ? template.partials : DEFAULT_PARTIALS,
          }))
        : undefined,
    [chordMode, mode, templates],
  );

  const analyzer = useNoteAnalyzer({
    chordTemplates,
    source,
    onNote: handleNote,
    onFrame: handleFrame,
    silent,
    gain,
    sensitivity,
  });
  const listening = analyzer.status !== 'idle';

  const handleScaleChange = (id: string) => {
    const next = scales.find((candidate) => candidate.id === id);
    if (next) {
      setScaleId(id);
      trackerRef.current.reset();
      if (persist) {
        saveScaleId(id);
      }
      scaleIdRef.current = id;
      const nextCalibration = loadCalibration(getScaleNotes(next), id);
      // A stored calibration belongs to the instrument, so switching scale must not overwrite it.
      if (controlled) {
        calibrationRef.current = nextCalibration;
        setCalibrationState(nextCalibration);
      } else {
        setCalibration(nextCalibration);
      }
      setPlayed([]);
    }
  };

  // Skips the first render: the initial scale (possibly restored from storage) is already set.
  const appliedDefaultRef = useRef(defaultScale);
  useEffect(() => {
    if (defaultScale && defaultScale !== appliedDefaultRef.current) {
      appliedDefaultRef.current = defaultScale;
      handleScaleChange(defaultScale);
    }
  }, [defaultScale]);

  const handleReset = () => {
    setCalibration(Calibration.createCalibration(notes, { strikes }));
    setRejection(undefined);
    setStrikeLog([]);
    setPlayed([]);
  };

  const handleSelect = (note: ScaleNote) => {
    if (source === 'synth') {
      analyzer.play(note.frequency * 2 ** ((Math.random() * 2 - 1) * (synthDetune / 1200)));
    } else if (mode === 'calibrate') {
      setCalibration(Calibration.selectNote(calibration, note.pitch));
    }
  };

  const target = mode === 'calibrate' ? Calibration.getTarget(calibration) : undefined;
  const progress = useMemo<Record<Pitch, number>>(
    () =>
      Object.fromEntries(
        notes.map(({ pitch }) => [pitch, (calibration.samples[pitch]?.length ?? 0) / calibration.strikes]),
      ),
    [calibration, notes],
  );

  const [latest] = played;
  // Recomputed every render: the tracker advances between renders, driven by the frame updates.
  const tracked = listening ? trackerRef.current.current : undefined;
  const display = (() => {
    const chord = listening ? chordRef.current?.notes : undefined;
    if (chord) {
      return {
        label: chordLabel(chord),
        pitch: chord.map(({ pitch }) => pitch).join(' '),
        active: chord.map(({ pitch }) => pitch),
        sounding: true,
      };
    }
    if (tracked) {
      const note = notes.find((candidate) => candidate.pitch === tracked.key);
      return {
        active: note ? [note.pitch] : undefined,
        label: note?.label,
        pitch: tracked.key,
        frequency: liveRef.current?.frequency,
        cents: tracked.cents,
        clarity: liveRef.current?.clarity,
        sounding: true,
      };
    }
    if (!latest) {
      return {};
    }
    // Nothing sounding: keep the last strike readable, but dimmed and without lighting its pad.
    if (latest.event.percussive) {
      return { percussive: true };
    }
    return latest.chord
      ? { label: chordLabel(latest.chord), pitch: latest.chord.map(({ pitch }) => pitch).join(' ') }
      : { label: latest.note?.label, pitch: latest.note?.pitch };
  })();

  const message = (() => {
    if (analyzer.status === 'error') {
      return analyzer.error?.message;
    }
    if (!listening) {
      return t('idle.message');
    }
    if (mode === 'calibrate') {
      if (!target) {
        return t('calibrate-complete.message');
      }
      const prompt = t('calibrate-prompt.message', { note: `${target.label} (${target.pitch})` });
      return rejection ? `${prompt} · ${t(`strike-${rejection}.message`)}` : prompt;
    }
    return t('listening.message');
  })();

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <SystemButton.Mic
            iconOnly
            variant='ghost'
            label={t(listening ? 'stop.label' : 'start.label')}
            recording={listening}
            onToggle={listening ? analyzer.stop : analyzer.start}
            data-testid='handpan.listen'
          />
          <Select.Root
            items={scales.map(({ id, name }) => ({ value: id, label: name }))}
            value={[scale.id]}
            onValueChange={({ value: [value] }) => value && handleScaleChange(value)}
          >
            <Select.Trigger classNames='text-sm' placeholder={t('scale.label')} data-testid='handpan.scale' />
            <Select.Content>
              {scales.map(({ id, name }) => (
                <Select.Item key={id} classNames='text-sm' item={{ value: id, label: name }} />
              ))}
            </Select.Content>
          </Select.Root>
          {source === 'synth' && (
            <Button.Root
              icon='ph--hand-palm--regular'
              label={t('percussive.label')}
              disabled={!listening}
              onClick={() => analyzer.play('tak')}
              data-testid='handpan.tak'
            />
          )}
          {mode === 'calibrate' && (
            <Button.Root
              icon='ph--arrow-counter-clockwise--regular'
              label={t('reset-calibration.label')}
              iconOnly
              onClick={handleReset}
            />
          )}
          {mode === 'live' && (
            <Button.Toggle
              icon='ph--stack--regular'
              label={t('chords.label')}
              pressed={chordMode}
              onPressedChange={setChordMode}
              data-testid='handpan.chords'
            />
          )}
          <Toolbar.Separator variant='gap' />
          <Toolbar.ToggleGroup
            type='single'
            value={mode}
            onValueChange={(value) => (value === 'calibrate' || value === 'live') && setMode(value)}
          >
            <ToggleGroup.Item
              value='calibrate'
              label={t('mode-calibrate.label')}
              data-testid='handpan.mode.calibrate'
            />
            <ToggleGroup.Item value='live' label={t('mode-live.label')} data-testid='handpan.mode.live' />
          </Toolbar.ToggleGroup>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <Layout.Flex column align='center' gap='lg' classNames='p-4 overflow-y-auto'>
          <NoteDisplay {...display} dimmed={!display.sounding} />
          <Layout.Flex gap='sm' align='center' classNames='w-full max-w-md'>
            <Oscilloscope
              classNames='h-16 grow'
              mode='waveform'
              active={analyzer.status === 'listening'}
              source={analyzer.monitor}
            />
            <LevelMeter
              level={listening ? analyzer.frame?.rms : 0}
              threshold={listening ? thresholdRef.current : undefined}
            />
          </Layout.Flex>
          <Layout.Grid cols={2} gap='md' classNames='w-full max-w-md'>
            <Tooltip.Trigger asChild content={t('gain.description')}>
              <Input.Slider
                label={`${t('gain.label')} ${gain > 0 ? '+' : ''}${gain} dB`}
                value={[gain]}
                min={-12}
                max={36}
                step={1}
                onValueChange={([value]) => handleGainChange(value)}
              />
            </Tooltip.Trigger>
            <Tooltip.Trigger asChild content={t('sensitivity.description')}>
              <Input.Slider
                label={`${t('sensitivity.label')} ${Math.round(sensitivity * 100)}%`}
                value={[sensitivity]}
                min={0}
                max={1}
                step={0.05}
                onValueChange={([value]) => handleSensitivityChange(value)}
              />
            </Tooltip.Trigger>
          </Layout.Grid>
          <HandpanLayout
            notes={notes}
            target={target?.pitch}
            active={display.sounding ? display.active : undefined}
            progress={mode === 'calibrate' ? progress : undefined}
            onSelect={source === 'synth' ? (listening ? handleSelect : undefined) : handleSelect}
          />
          <span
            className='text-sm text-fg-muted'
            role='status'
            data-testid='handpan.status'
            data-analyzer={analyzer.status}
          >
            {message}
          </span>
          {/* Fixed height for the heading plus STRIKE_LOG_SIZE lines, so new strikes never move the pads. */}
          {mode === 'calibrate' && listening && (
            <Layout.Flex
              column
              align='center'
              gap='xs'
              classNames='text-xs h-28 shrink-0 overflow-hidden'
              data-testid='handpan.strike-log'
            >
              <span className='text-fg-subtle'>
                {strikeLog.length ? t('strike-log.label') : t('strike-log-empty.message')}
              </span>
              {strikeLog.map(({ key, text, accepted }) => (
                <span key={key} className={accepted ? 'text-success-text' : 'text-fg-muted'}>
                  {text}
                </span>
              ))}
            </Layout.Flex>
          )}
          {/* Always rendered so the first strike does not shift the pads. */}
          <Layout.Flex column align='center' gap='xs' classNames={played.length === 0 ? 'invisible' : undefined}>
            <span className='text-xs text-fg-subtle'>{t('history.label')}</span>
            <Layout.Flex wrap gap='xs' classNames='min-h-6 font-mono text-sm' data-testid='handpan.history'>
              {[...played].reverse().map(({ event, note, chord }) => (
                <span
                  key={event.time}
                  className='px-1 rounded-sm bg-group-surface'
                  title={
                    event.percussive
                      ? t('percussive.label')
                      : chord
                        ? chord.map(({ pitch }) => pitch).join(' ')
                        : note?.pitch
                  }
                >
                  {event.percussive ? 'T' : chord ? chordLabel(chord) : (note?.label ?? '?')}
                </span>
              ))}
            </Layout.Flex>
          </Layout.Flex>
        </Layout.Flex>
      </Panel.Body>
    </Panel.Root>
  );
};
