//
// Copyright 2026 DXOS.org
//

import React, { forwardRef, useCallback, useMemo } from 'react';

import { type ComposableProps } from '@dxos/react-ui';
import { composableProps } from '@dxos/ui-theme';
import { Form, type FormFieldMap, SelectField, omitId } from '@dxos/react-ui-form';

import { Sequence } from '../../types';
import { BRAINWAVE_PRESETS, SAMPLE_URLS } from '../../generator';
import { SAMPLE_URLS } from '../../generator';

export type SequencerProps = ComposableProps<HTMLDivElement> & {
  sequence: Sequence.Sequence;
  onUpdate: (sequence: Sequence.Sequence) => void;
};

/** Form editor for a single sequence layer. */
export const Sequencer = forwardRef<HTMLDivElement, SequencerProps>(
  ({ sequence, onUpdate, ...props }, forwardedRef) => {
    const schema = useMemo(() => omitId(Sequence.Sequence), []);

    // Custom field map to render the source.type discriminator as a select.
    const fieldMap = useMemo<FormFieldMap>(
      () => ({
        'source.type': (fieldProps) => (
          <SelectField
            {...fieldProps}
            options={[
              { label: 'Sample', value: 'sample' },
              { label: 'Generator', value: 'generator' },
            ]}
          />
        ),
        'source.sample': (fieldProps) => (
          <SelectField
            {...fieldProps}
            options={Object.keys(SAMPLE_URLS).map((key) => ({
              label: key,
              value: key,
            }))}
          />
        ),
      }),
      [],
    );

    const handleValuesChanged = useCallback(
      (newValues: Partial<Sequence.Sequence>, { changed }: { changed: Record<string, boolean> }) => {
        const changedKeys = Object.keys(changed).filter((key) => changed[key]);
        if (changedKeys.length === 0) {
          return;
        }

        const updated = { ...sequence, ...newValues };

        // TODO(burdon): Update if generator preset changed.
        // Seed default source when discriminator changes.
        if (
          changedKeys.includes('source.type') &&
          newValues.source?.type &&
          newValues.source.type !== sequence.source.type
        ) {
          updated.source = Sequence.DEFAULT_SOURCES[newValues.source.type];
        }

        // Sync beatFrequency when generator preset changes.
        if (changedKeys.includes('source.preset') && updated.source.type === 'generator') {
          const { beatFrequency } = BRAINWAVE_PRESETS[updated.source.preset];
          updated.source = { ...updated.source, beatFrequency };
        }

        onUpdate(updated);
      },
      [sequence, onUpdate],
    );

    return (
      <div {...composableProps<HTMLDivElement>(props)} ref={forwardedRef}>
        <Form.Root<Omit<Sequence.Sequence, 'id'>>
          key={sequence.id}
          schema={schema}
          defaultValues={sequence}
          fieldMap={fieldMap}
          onValuesChanged={handleValuesChanged}
        >
          <Form.Viewport>
            <Form.Content>
              <Form.FieldSet />
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
      </div>
    );
  },
);
