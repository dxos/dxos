//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

// Loaded only through the lazy `RangeList` container, so Next's CSS stays out of the boot graph.
import '@dxos/react-ui/theme.css';
import { rangeToA1Notation } from '@dxos/compute-hyperformula';
import { useObject } from '@dxos/echo-react';
import { Form } from '@dxos/react-ui-form';
import { OrderedList } from '@dxos/react-ui-list';
import * as Banner from '@dxos/react-ui/Banner';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { ALIGN_ICONS, STYLE_ICONS } from '#components';
import { meta } from '#meta';
import { type Sheet, SheetRange, SheetUtil } from '#types';

/** The list is a form row of its own, so its label and spacing match the object form it sits under; it edits no fields. */
const NO_FIELDS = Schema.Struct({});

/**
 * The range, monospace with room for 12 characters (e.g. `AA100:AB1000`) plus the row text's inline padding, giving way
 * first in a narrow panel; then its formatting toolbar, never narrower than its buttons so it never scrolls; then its
 * remove button.
 */
const COLUMNS = 'minmax(0, calc(12ch + 1rem)) minmax(max-content, 1fr) var(--dx-block-size)';

const isAlignValue = (value: string): value is SheetRange.AlignValue => value in ALIGN_ICONS;
const isStyleValue = (value: string): value is SheetRange.StyleValue => value in STYLE_ICONS;

/** The formatting on one cell range: the entries sharing its `range` index. */
type FormattedRange = { range: string; align?: SheetRange.AlignValue; styles: SheetRange.StyleValue[] };

const groupByRange = (ranges: readonly Sheet.Range[]): FormattedRange[] => {
  const byRange = new Map<string, FormattedRange>();
  for (const { range, key, value } of ranges) {
    const entry = byRange.get(range) ?? { range, styles: [] };
    if (key === SheetRange.alignKey && isAlignValue(value)) {
      entry.align = value;
    } else if (key === SheetRange.styleKey && isStyleValue(value)) {
      entry.styles.push(value);
    }
    byRange.set(range, entry);
  }
  return [...byRange.values()];
};

export type RangeListProps = {
  sheet: Sheet.Sheet;
};

/** The sheet's formatted cell ranges, each with a toolbar of its alignment and styles, and removable. */
export const RangeList = ({ sheet: sheetProp }: RangeListProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const [sheet, updateSheet] = useObject(sheetProp);
  const ranges = useMemo(() => groupByRange(sheet.ranges), [sheet.ranges]);

  const getPosition = useCallback(
    (range: string) => rangeToA1Notation(SheetUtil.rangeFromIndex(sheetProp, range)),
    [sheetProp],
  );

  // Replaces a range's entries for one key, keeping every other range and key in place.
  const setFormatting = useCallback(
    (range: string, key: string, values: readonly string[]) =>
      updateSheet((sheet) => {
        for (let index = sheet.ranges.length - 1; index >= 0; index--) {
          if (sheet.ranges[index].range === range && sheet.ranges[index].key === key) {
            sheet.ranges.splice(index, 1);
          }
        }
        for (const value of values) {
          sheet.ranges.push({ range, key, value });
        }
      }),
    [updateSheet],
  );

  const handleDelete = useCallback(
    (range: string) =>
      updateSheet((sheet) => {
        for (let index = sheet.ranges.length - 1; index >= 0; index--) {
          if (sheet.ranges[index].range === range) {
            sheet.ranges.splice(index, 1);
          }
        }
      }),
    [updateSheet],
  );

  return (
    <Form.Root schema={NO_FIELDS}>
      <Form.Field standalone label={t('range-list.heading')}>
        {ranges.length === 0 ? (
          <Banner.Root>
            <Banner.Title>{t('no-ranges.message')}</Banner.Title>
          </Banner.Root>
        ) : (
          <OrderedList.Root<FormattedRange>
            items={ranges}
            getId={({ range }) => range}
            getLabel={({ range }) => getPosition(range)}
            columns={COLUMNS}
          >
            {({ items }) => (
              // The form row supplies the gutters, so the list's columns take its full width.
              <OrderedList.Content gutter='none' aria-label={t('range-list.heading')}>
                {items.map(({ range, align, styles }) => (
                  <OrderedList.Item key={range} id={range} canDrag={false} data-testid={`range.${getPosition(range)}`}>
                    <OrderedList.ItemText classNames='font-mono'>{getPosition(range)}</OrderedList.ItemText>
                    <Toolbar.Root size='sm'>
                      <Toolbar.ToggleGroup
                        type='single'
                        value={align ?? ''}
                        onValueChange={(value) => setFormatting(range, SheetRange.alignKey, value ? [value] : [])}
                      >
                        {Object.entries(ALIGN_ICONS).map(([value, icon]) => (
                          <ToggleGroup.Item
                            key={value}
                            value={value}
                            icon={icon}
                            label={t(`range-value.${value}.label`)}
                            iconOnly
                          />
                        ))}
                      </Toolbar.ToggleGroup>
                      <Toolbar.Separator />
                      <Toolbar.ToggleGroup
                        type='multiple'
                        value={styles}
                        onValueChange={(values) => setFormatting(range, SheetRange.styleKey, values)}
                      >
                        {Object.entries(STYLE_ICONS).map(([value, icon]) => (
                          <ToggleGroup.Item
                            key={value}
                            value={value}
                            icon={icon}
                            label={t(`range-value.${value}.label`)}
                            iconOnly
                          />
                        ))}
                      </Toolbar.ToggleGroup>
                    </Toolbar.Root>
                    <SystemButton.Remove onClick={() => handleDelete(range)} />
                  </OrderedList.Item>
                ))}
              </OrderedList.Content>
            )}
          </OrderedList.Root>
        )}
      </Form.Field>
    </Form.Root>
  );
};

RangeList.displayName = 'RangeList';
