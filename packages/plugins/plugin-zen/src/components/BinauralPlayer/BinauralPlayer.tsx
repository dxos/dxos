//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type ThemedClassName, Toolbar } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';
import { Form } from '@dxos/react-ui-form';

import {
  BinauralGenerator,
  BinauralConfigSchema,
  BRAINWAVE_PRESETS,
  DEFAULT_CONFIG,
  type BinauralConfig,
  type BrainwavePreset,
} from '../../generator';

export type BinauralPlayerProps = ThemedClassName<{}>;

/** Binaural beat player with configurable parameters and play/pause controls. */
export const BinauralPlayer = ({ classNames }: BinauralPlayerProps) => {
  const contextRef = useRef<AudioContext | undefined>(undefined);
  const generatorRef = useRef<BinauralGenerator | undefined>(undefined);
  const [playing, setPlaying] = useState(false);
  const [values, setValues] = useState<BinauralConfig>({ ...DEFAULT_CONFIG });

  // Clean up on unmount.
  useEffect(() => {
    return () => {
      void generatorRef.current?.stop();
      void contextRef.current?.close();
    };
  }, []);

  const handleTogglePlay = useCallback(async () => {
    if (generatorRef.current?.playing) {
      await generatorRef.current.stop();
      await contextRef.current?.close();
      contextRef.current = undefined;
      generatorRef.current = undefined;
      setPlaying(false);
    } else {
      const context = new AudioContext();
      contextRef.current = context;
      const generator = new BinauralGenerator(context, context.destination, values);
      generatorRef.current = generator;
      await generator.start();
      setPlaying(true);
    }
  }, [values]);

  const handleValuesChanged = useCallback(
    (newValues: Partial<BinauralConfig>, { changed }: { changed: Record<string, boolean> }) => {
      const changedKeys = Object.keys(changed).filter((key) => changed[key]);
      if (changedKeys.length === 0) {
        return;
      }

      const updated = { ...values, ...newValues };

      // Apply preset beat frequency when preset changes.
      if (changedKeys.includes('preset') && newValues.preset) {
        const { beatFrequency } = BRAINWAVE_PRESETS[newValues.preset as BrainwavePreset];
        updated.beatFrequency = beatFrequency;
      }

      setValues(updated);

      // Apply to generator if playing.
      if (generatorRef.current?.playing) {
        generatorRef.current.setConfig(updated);
      }
    },
    [values],
  );

  const schema = useMemo(() => BinauralConfigSchema, []);

  return (
    <div className={mx(classNames)}>
      <Toolbar.Root>
        <Toolbar.IconButton
          icon={playing ? 'ph--pause--regular' : 'ph--play--regular'}
          iconOnly
          label={playing ? 'Pause' : 'Play'}
          onClick={handleTogglePlay}
        />
        <Toolbar.IconButton
          icon='ph--stop--regular'
          iconOnly
          label='Stop'
          disabled={!playing}
          onClick={async () => {
            await generatorRef.current?.stop();
            await contextRef.current?.close();
            contextRef.current = undefined;
            generatorRef.current = undefined;
            setPlaying(false);
          }}
        />
      </Toolbar.Root>
      <Form.Root schema={schema} defaultValues={values} onValuesChanged={handleValuesChanged}>
        <Form.Viewport>
          <Form.Content>
            <Form.FieldSet />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </div>
  );
};
