//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

// Loaded only through the lazy `RangeList` container, so Next's CSS stays out of the boot graph.
import '@dxos/react-ui/theme.css';
import { addressToA1Notation, rangeFromA1Notation, rangeToA1Notation } from '@dxos/compute-hyperformula';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useSelection, useSelectionActions } from '@dxos/react-ui-attention';
import { Form } from '@dxos/react-ui-form';
import { OrderedList } from '@dxos/react-ui-list';
import * as Banner from '@dxos/react-ui/Banner';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { type FormattedRange, FormattingToolbar, formattingByRange, writeFormatting } from '#components';
import { type Sheet, SheetUtil } from '#types';

import { SheetNamespace } from '../../namespace.ts';

/** The list is a form row of its own, so its label and spacing match the object form it sits under; it edits no fields. */
const NO_FIELDS = Schema.Struct({});

/**
 * The range, monospace with room for 12 characters (e.g. `AA100:AB1000`) plus the row text's inline padding, giving way
 * first in a narrow panel; then its formatting toolbar, never narrower than its buttons so it never scrolls; then the
 * buttons that move the formatting to the sheet's selection and remove it.
 */
const COLUMNS = 'minmax(0, calc(12ch + 1rem)) minmax(max-content, 1fr) var(--dx-block-size) var(--dx-block-size)';

export type RangeListProps = {
  sheet: Sheet.Sheet;
};

/**
 * The sheet's formatted cell ranges, each with a toolbar of its alignment, styles and highlight. Selecting a row selects
 * its range in the sheet; a row can take the sheet's selection as its range, or be removed.
 */
export const RangeList = ({ sheet: sheetProp }: RangeListProps) => {
  const { t } = Hooks.useTranslation(SheetNamespace.key);
  const [sheet, updateSheet] = useObject(sheetProp);
  const ranges = useMemo(() => formattingByRange(sheet.ranges), [sheet.ranges]);

  // The sheet shares its selection through the `Selection` view state, as the charts companion does.
  const contextId = Obj.getURI(sheetProp);
  const selection = useSelection(contextId, 'range');
  const { range: setSelection } = useSelectionActions(contextId);
  const selectedIndex = useMemo(
    () =>
      selection
        ? SheetUtil.rangeToIndex(sheetProp, rangeFromA1Notation(`${selection.from}:${selection.to}`))
        : undefined,
    [sheetProp, selection],
  );

  const getPosition = useCallback(
    (range: string) => rangeToA1Notation(SheetUtil.rangeFromIndex(sheetProp, range)),
    [sheetProp],
  );

  const setFormatting = useCallback(
    (range: string, key: string, values: readonly string[], managed?: readonly string[]) =>
      updateSheet((sheet) => writeFormatting(sheet, range, key, values, managed)),
    [updateSheet],
  );

  const handleSelect = useCallback(
    (range: string) => {
      const { from, to } = SheetUtil.rangeFromIndex(sheetProp, range);
      setSelection(addressToA1Notation(from), addressToA1Notation(to));
    },
    [sheetProp, setSelection],
  );

  // Moves a row's formatting to the sheet's selection.
  const handleUseSelection = useCallback(
    (range: string) =>
      selectedIndex &&
      updateSheet((sheet) => {
        for (const entry of sheet.ranges) {
          if (entry.range === range) {
            entry.range = selectedIndex;
          }
        }
      }),
    [selectedIndex, updateSheet],
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
            // Selectable, so a row hovers, and a click or Enter selects its range in the sheet; the selected row is the
            // one whose range the sheet has selected.
            value={selectedIndex ?? ''}
            onValueChange={handleSelect}
          >
            {({ items }) => (
              // The form row supplies the gutters, so the list's columns take its full width.
              <OrderedList.Content gutter='none' aria-label={t('range-list.heading')}>
                {items.map(({ range, ...formatting }) => (
                  <OrderedList.Item key={range} id={range} canDrag={false} data-testid={`range.${getPosition(range)}`}>
                    <OrderedList.ItemText classNames='font-mono'>{getPosition(range)}</OrderedList.ItemText>
                    <Toolbar.Root size='sm'>
                      <FormattingToolbar
                        formatting={formatting}
                        onChange={(key, values, managed) => setFormatting(range, key, values, managed)}
                      />
                    </Toolbar.Root>
                    <Button.Root
                      variant='ghost'
                      iconOnly
                      icon='ph--selection-plus--regular'
                      label={t('use-selection.label')}
                      // A selection that already has formatting of its own is not a target: moving onto it would merge two rows.
                      disabled={!selectedIndex || ranges.some(({ range }) => range === selectedIndex)}
                      onClick={() => handleUseSelection(range)}
                    />
                    <SystemButton.Remove variant='ghost' onClick={() => handleDelete(range)} />
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
