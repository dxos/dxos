//
// Copyright 2026 DXOS.org
//

import React, { forwardRef, useCallback, useMemo } from 'react';

import { type ComposableProps } from '@dxos/react-ui';
import { composableProps } from '@dxos/ui-theme';
import { Form, type FormFieldMap, SelectField, omitId } from '@dxos/react-ui-form';

import { Sequence } from '../../types';

const sourceTypeOptions = [
  { label: 'Sample', value: 'sample' },
  { label: 'Generator', value: 'generator' },
];

export type SequencePanelProps = ComposableProps<HTMLDivElement> & {
  sequence: Sequence.Sequence;
  onUpdate: (sequence: Sequence.Sequence) => void;
};

/** Form editor for a single sequence layer. */
export const SequencePanel = forwardRef<HTMLDivElement, SequencePanelProps>(
  ({ sequence, onUpdate, ...props }, forwardedRef) => {
    const schema = useMemo(() => omitId(Sequence.Sequence), []);

    // Custom field map to render the source.type discriminator as a select.
    const fieldMap = useMemo<FormFieldMap>(
      () => ({
        'source.type': (fieldProps) => <SelectField {...fieldProps} options={sourceTypeOptions} />,
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

        // Seed default source when discriminator changes.
        if (
          changedKeys.includes('source.type') &&
          newValues.source?.type &&
          newValues.source.type !== sequence.source.type
        ) {
          updated.source = Sequence.DEFAULT_SOURCES[newValues.source.type];
        }

        onUpdate(updated);
      },
      [sequence, onUpdate],
    );

    return (
      <div {...composableProps<HTMLDivElement>(props)} ref={forwardedRef}>
        <Form.Root
          key={sequence.id}
          schema={schema}
          defaultValues={sequence as any}
          fieldMap={fieldMap}
          onValuesChanged={handleValuesChanged as any}
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
