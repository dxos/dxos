//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { type SelectOption } from '@dxos/echo/Format';
import { PublicKey } from '@dxos/keys';
import { Next, useTranslation } from '@dxos/react-ui';
import { OrderedList } from '@dxos/react-ui-list';
import { hues } from '@dxos/ui-types';
import { arrayMove } from '@dxos/util';

import { translationKey } from '#translations';
import { type FormFieldRendererProps } from '#types';

import { HueSelect } from './HueField.tsx';

/** A hue no option uses yet, else one the last three options do not use. */
const nextHue = (options: readonly SelectOption[]) => {
  const used = new Set(options.map((option) => option.color));
  const unused = hues.filter((hue) => !used.has(hue));
  if (unused.length > 0) {
    return unused[Math.floor(Math.random() * unused.length)];
  }
  const recent = new Set(options.slice(-3).map((option) => option.color));
  const available = hues.filter((hue) => !recent.has(hue));
  return available[Math.floor(Math.random() * available.length)] ?? hues[0];
};

/**
 * The options of a single- or multi-select property: an `OrderedList` of disclosure rows, each a hued `Tag` that opens
 * to its label and hue, with a remove action; options reorder by drag or Alt+Arrow, and "Add option" appends one
 * opened for editing.
 */
export const SelectOptionField = ({
  type,
  label,
  readonly,
  getValue,
  onValueChange,
}: FormFieldRendererProps<SelectOption[] | undefined>) => {
  const { t } = useTranslation(translationKey);
  const options = getValue();
  const [expandedId, setExpandedId] = useState<string>();

  useEffect(() => {
    if (options === undefined) {
      onValueChange(type, []);
    }
  }, [options, type, onValueChange]);

  const update = useCallback(
    (id: string, change: Partial<SelectOption>) =>
      onValueChange(
        type,
        (options ?? []).map((option) => (option.id === id ? { ...option, ...change } : option)),
      ),
    [options, type, onValueChange],
  );

  const handleAdd = useCallback(() => {
    const id = PublicKey.random().truncate();
    onValueChange(type, [...(options ?? []), { id, title: '', color: nextHue(options ?? []) }]);
    setExpandedId(id);
  }, [options, type, onValueChange]);

  const handleMove = useCallback(
    (from: number, to: number) => {
      const next = [...(options ?? [])];
      arrayMove(next, from, to);
      onValueChange(type, next);
    },
    [options, type, onValueChange],
  );

  return (
    <>
      <OrderedList.Root
        items={options ?? []}
        getId={(option) => option.id}
        getLabel={(option) => option.title}
        onMove={handleMove}
        readonly={!!readonly}
      >
        {({ items }) => (
          <OrderedList.Content scroll={false} gutter='inherit' aria-label={label}>
            {items.map((option) => (
              <OrderedList.Item
                key={option.id}
                id={option.id}
                canDrag={!readonly}
                open={expandedId === option.id}
                onOpenChange={(open) => setExpandedId(open ? option.id : undefined)}
                data-testid={`option-${option.id}`}
              >
                <OrderedList.DragHandle />
                <OrderedList.ItemText>
                  <Next.Tag hue={hues.find((hue) => hue === option.color)}>{option.title || '\u200b'}</Next.Tag>
                </OrderedList.ItemText>
                {!readonly && (
                  <Next.Button
                    iconOnly
                    variant='ghost'
                    icon='ph--x--regular'
                    label={t('select-option-delete.button')}
                    onClick={() =>
                      onValueChange(
                        type,
                        (options ?? []).filter((item) => item.id !== option.id),
                      )
                    }
                  />
                )}
                <OrderedList.Detail>
                  <Next.Container layout='row' gutter='none' columns='minmax(0, 1fr) minmax(0, 1fr)' gap='sm'>
                    <Next.Field.Root>
                      <Next.Field.Label>{t('select-option.label')}</Next.Field.Label>
                      <Next.Input
                        autoFocus={expandedId === option.id && option.title === ''}
                        disabled={!!readonly}
                        placeholder={t('select-option-label.placeholder')}
                        value={option.title}
                        onChange={(event) => update(option.id, { title: event.target.value })}
                        onKeyDown={(event) => event.key === 'Enter' && setExpandedId(undefined)}
                      />
                    </Next.Field.Root>
                    <Next.Field.Root>
                      <Next.Field.Label>{t('select-option-color.label')}</Next.Field.Label>
                      <HueSelect
                        value={option.color}
                        readonly={readonly}
                        onValueChange={(color) => color && update(option.id, { color })}
                      />
                    </Next.Field.Root>
                  </Next.Container>
                </OrderedList.Detail>
              </OrderedList.Item>
            ))}
          </OrderedList.Content>
        )}
      </OrderedList.Root>
      {!readonly && (
        <Next.Group>
          <Next.Button icon='ph--plus--regular' label={t('select-option-add.button')} onClick={handleAdd} />
        </Next.Group>
      )}
    </>
  );
};
