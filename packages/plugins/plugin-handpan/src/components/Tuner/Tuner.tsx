//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Oscilloscope } from '@dxos/react-ui-audio';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';
import * as Select from '@dxos/react-ui/Select';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import {
  Calibration,
  type Classification,
  type NoteEvent,
  type NoteTemplate,
  type Pitch,
  type Scale,
  type ScaleNote,
  SCALES,
  cents,
  classifyNote,
  formatPitch,
  frequencyToMidi,
  getScaleNotes,
  nominalTemplates,
} from '#audio';
import { type AudioSourceKind, useNoteAnalyzer } from '#hooks';
import { meta } from '#meta';

import { HandpanLayout } from '../HandpanLayout/index.ts';
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
  /** Analyze synthesized strikes without playing them (e.g. while a microphone is in use nearby). */
  silent?: boolean;
  /** Keep the selected scale and each scale's calibration in this browser (local storage) across reloads. */
  persist?: boolean;
  onNote?: (event: NoteEvent, classification?: Classification) => void;
};

type PlayedNote = {
  event: NoteEvent;
  note?: ScaleNote;
  classification?: Classification;
};

const HISTORY_SIZE = 16;

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

/** Frequency a played note is measured against: its classified template, else its scale pitch. */
const referenceFrequency = ({ classification, note }: PlayedNote, templates: NoteTemplate[]): number | undefined =>
  classification?.template.frequency ??
  templates.find((template) => template.pitch === note?.pitch)?.frequency ??
  note?.frequency;

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
  silent = false,
  onNote,
}: TunerProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [mode, setMode] = useState<TunerMode>(defaultMode);
  const [scaleId, setScaleId] = useState(() => {
    const saved = persist ? loadScaleId() : undefined;
    return scales.some((candidate) => candidate.id === saved) ? saved : defaultScale;
  });
  const [played, setPlayed] = useState<PlayedNote[]>([]);

  const scale = scales.find((candidate) => candidate.id === scaleId) ?? scales[0];
  const notes = useMemo(() => getScaleNotes(scale), [scale]);

  // A ref mirrors the calibration because strikes arrive from the audio callback, outside render.
  const [calibration, setCalibrationState] = useState(() =>
    persist
      ? Calibration.restore(notes, loadSamples(scale.id), { strikes })
      : Calibration.createCalibration(notes, { strikes }),
  );
  const calibrationRef = useRef(calibration);
  const scaleIdRef = useRef(scale.id);
  scaleIdRef.current = scale.id;
  const setCalibration = useCallback(
    (state: Calibration.CalibrationState) => {
      calibrationRef.current = state;
      setCalibrationState(state);
      if (persist) {
        saveSamples(scaleIdRef.current, state.samples);
      }
    },
    [persist],
  );
  const [rejection, setRejection] = useState<Calibration.StrikeRejection>();

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

  const handleNote = useCallback(
    (event: NoteEvent) => {
      if (modeRef.current === 'calibrate') {
        const target = Calibration.getTarget(calibrationRef.current);
        const result = Calibration.addStrike(calibrationRef.current, event);
        setCalibration(result.state);
        setRejection(result.rejected);
        if (!result.rejected) {
          setPlayed((previous) => [{ event, note: target }, ...previous].slice(0, HISTORY_SIZE));
        }
        onNote?.(event);
        return;
      }

      const classification = event.frequency
        ? classifyNote({ frequency: event.frequency, partials: event.partials }, templatesRef.current)
        : undefined;
      const note = classification && notes.find((candidate) => candidate.pitch === classification.template.pitch);
      setPlayed((previous) => [{ event, note, classification }, ...previous].slice(0, HISTORY_SIZE));
      onNote?.(event, classification);
    },
    [notes, onNote, setCalibration],
  );

  const analyzer = useNoteAnalyzer({ source, onNote: handleNote, silent });
  const listening = analyzer.status !== 'idle';

  const handleScaleChange = (id: string) => {
    const next = scales.find((candidate) => candidate.id === id);
    if (next) {
      setScaleId(id);
      if (persist) {
        saveScaleId(id);
      }
      scaleIdRef.current = id;
      setCalibration(
        persist
          ? Calibration.restore(getScaleNotes(next), loadSamples(id), { strikes })
          : Calibration.createCalibration(getScaleNotes(next), { strikes }),
      );
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
  const display = useMemo(() => {
    const frame = analyzer.frame;
    const reference = latest && !latest.event.percussive ? referenceFrequency(latest, templates) : undefined;
    // While the struck note sustains, the live frame keeps its meter moving.
    if (
      latest &&
      reference !== undefined &&
      frame?.frequency !== undefined &&
      frame.time >= latest.event.time &&
      Math.abs(cents(frame.frequency, reference)) < 60
    ) {
      return {
        label: latest.note?.label,
        pitch: latest.note?.pitch,
        frequency: frame.frequency,
        cents: cents(frame.frequency, reference),
        clarity: frame.clarity,
      };
    }
    // Any other clear pitch is shown live, so input is visible before (or without) a resolved strike.
    if (frame?.frequency !== undefined) {
      const classification = classifyNote({ frequency: frame.frequency, partials: [] }, templates);
      const note = classification && notes.find((candidate) => candidate.pitch === classification.template.pitch);
      return {
        label: note?.label,
        pitch: note?.pitch ?? formatPitch(frequencyToMidi(frame.frequency)),
        frequency: frame.frequency,
        cents: classification?.cents,
        clarity: frame.clarity,
      };
    }
    if (!latest) {
      return {};
    }
    if (latest.event.percussive) {
      return { percussive: true };
    }
    return {
      label: latest.note?.label,
      pitch: latest.note?.pitch,
      frequency: latest.event.frequency,
      cents:
        latest.event.frequency !== undefined && reference !== undefined && latest.event.precise
          ? cents(latest.event.frequency, reference)
          : undefined,
      clarity: latest.event.clarity,
    };
  }, [latest, analyzer.frame, templates, notes]);

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
          <Button.Root
            icon={listening ? 'ph--stop--regular' : 'ph--microphone--regular'}
            label={t(listening ? 'stop.label' : 'start.label')}
            onClick={listening ? analyzer.stop : analyzer.start}
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
          <ToggleGroup.Root
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
          </ToggleGroup.Root>
          <Toolbar.Separator />
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
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <Layout.Flex column align='center' gap='lg' classNames='p-4 overflow-y-auto'>
          <NoteDisplay {...display} />
          <Oscilloscope
            classNames='h-16 w-full max-w-md'
            mode='waveform'
            active={analyzer.status === 'listening'}
            source={analyzer.monitor}
          />
          <HandpanLayout
            notes={notes}
            target={target?.pitch}
            active={display.label ? display.pitch : undefined}
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
          {/* Always rendered so the first strike does not shift the pads. */}
          <Layout.Flex column align='center' gap='xs' classNames={played.length === 0 ? 'invisible' : undefined}>
            <span className='text-xs text-fg-subtle'>{t('history.label')}</span>
            <Layout.Flex wrap gap='xs' classNames='min-h-6 font-mono text-sm' data-testid='handpan.history'>
              {[...played].reverse().map(({ event, note }) => (
                <span
                  key={event.time}
                  className='px-1 rounded-sm bg-group-surface'
                  title={event.percussive ? t('percussive.label') : note?.pitch}
                >
                  {event.percussive ? 'T' : (note?.label ?? '?')}
                </span>
              ))}
            </Layout.Flex>
          </Layout.Flex>
        </Layout.Flex>
      </Panel.Body>
    </Panel.Root>
  );
};
