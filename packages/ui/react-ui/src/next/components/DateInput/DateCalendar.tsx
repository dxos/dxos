//
// Copyright 2026 DXOS.org
//

import { DatePicker as DatePickerPrimitive, useDatePickerContext } from '@ark-ui/react/date-picker';
import { Portal } from '@ark-ui/react/portal';
import React, { type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import * as Button from '../Button/Button.tsx';
import { usePopupSize } from '../ScrollArea/PopupScroll.tsx';

/** Months and years are laid out four to a row, as the current Calendar's pickers. */
const GRID_COLUMNS = 4;

type CalendarView = 'day' | 'month' | 'year';

/** What the previous and next triggers step by in each view: months, years or decades. */
const NAV_LABELS: Record<CalendarView, { previous: string; next: string }> = {
  day: { previous: 'calendar.nav.previous.label', next: 'calendar.nav.next.label' },
  month: { previous: 'calendar.nav.previous-year.label', next: 'calendar.nav.next-year.label' },
  year: { previous: 'calendar.nav.previous-decade.label', next: 'calendar.nav.next-decade.label' },
};

/** Previous, view (month/year/decade caption) and next, over each view's table. */
const ViewControl = ({ view }: { view: CalendarView }) => {
  const { t } = useTranslation(translationKey);
  return (
    <DatePickerPrimitive.ViewControl className={recipes.dateCalendarHeader()}>
      <DatePickerPrimitive.PrevTrigger asChild>
        <Button.Button
          icon='ph--caret-left--regular'
          label={t(NAV_LABELS[view].previous)}
          iconOnly
          variant='ghost'
          showTooltip={false}
        />
      </DatePickerPrimitive.PrevTrigger>
      <DatePickerPrimitive.ViewTrigger asChild>
        <Button.Button variant='ghost' classNames={recipes.dateCalendarTitle()}>
          <DatePickerPrimitive.RangeText />
        </Button.Button>
      </DatePickerPrimitive.ViewTrigger>
      <DatePickerPrimitive.NextTrigger asChild>
        <Button.Button
          icon='ph--caret-right--regular'
          label={t(NAV_LABELS[view].next)}
          iconOnly
          variant='ghost'
          showTooltip={false}
        />
      </DatePickerPrimitive.NextTrigger>
    </DatePickerPrimitive.ViewControl>
  );
};

const DayView = () => {
  const picker = useDatePickerContext();
  return (
    <DatePickerPrimitive.View view='day' className={recipes.dateCalendarView()}>
      <ViewControl view='day' />
      <DatePickerPrimitive.Table className={recipes.dateCalendarTable()}>
        <DatePickerPrimitive.TableHead>
          <DatePickerPrimitive.TableRow>
            {picker.weekDays.map((weekDay, index) => (
              <DatePickerPrimitive.TableHeader key={index} abbr={weekDay.long}>
                {weekDay.narrow}
              </DatePickerPrimitive.TableHeader>
            ))}
          </DatePickerPrimitive.TableRow>
        </DatePickerPrimitive.TableHead>
        <DatePickerPrimitive.TableBody>
          {picker.weeks.map((week, index) => (
            <DatePickerPrimitive.TableRow key={index}>
              {week.map((day) => (
                <DatePickerPrimitive.TableCell key={day.toString()} value={day}>
                  <DatePickerPrimitive.TableCellTrigger className={recipes.dateCalendarCell()}>
                    {day.day}
                  </DatePickerPrimitive.TableCellTrigger>
                </DatePickerPrimitive.TableCell>
              ))}
            </DatePickerPrimitive.TableRow>
          ))}
        </DatePickerPrimitive.TableBody>
      </DatePickerPrimitive.Table>
    </DatePickerPrimitive.View>
  );
};

const MonthView = () => {
  const picker = useDatePickerContext();
  return (
    <DatePickerPrimitive.View view='month' className={recipes.dateCalendarView()}>
      <ViewControl view='month' />
      <DatePickerPrimitive.Table columns={GRID_COLUMNS} className={recipes.dateCalendarTable()}>
        <DatePickerPrimitive.TableBody>
          {picker.getMonthsGrid({ columns: GRID_COLUMNS, format: 'short' }).map((months, index) => (
            <DatePickerPrimitive.TableRow key={index}>
              {months.map((month) => (
                <DatePickerPrimitive.TableCell key={month.value} value={month.value}>
                  <DatePickerPrimitive.TableCellTrigger className={recipes.dateCalendarCell()}>
                    {month.label}
                  </DatePickerPrimitive.TableCellTrigger>
                </DatePickerPrimitive.TableCell>
              ))}
            </DatePickerPrimitive.TableRow>
          ))}
        </DatePickerPrimitive.TableBody>
      </DatePickerPrimitive.Table>
    </DatePickerPrimitive.View>
  );
};

const YearView = () => {
  const picker = useDatePickerContext();
  return (
    <DatePickerPrimitive.View view='year' className={recipes.dateCalendarView()}>
      <ViewControl view='year' />
      <DatePickerPrimitive.Table columns={GRID_COLUMNS} className={recipes.dateCalendarTable()}>
        <DatePickerPrimitive.TableBody>
          {picker.getYearsGrid({ columns: GRID_COLUMNS }).map((years, index) => (
            <DatePickerPrimitive.TableRow key={index}>
              {years.map((year) => (
                <DatePickerPrimitive.TableCell key={year.value} value={year.value} disabled={year.disabled}>
                  <DatePickerPrimitive.TableCellTrigger className={recipes.dateCalendarCell()}>
                    {year.label}
                  </DatePickerPrimitive.TableCellTrigger>
                </DatePickerPrimitive.TableCell>
              ))}
            </DatePickerPrimitive.TableRow>
          ))}
        </DatePickerPrimitive.TableBody>
      </DatePickerPrimitive.Table>
    </DatePickerPrimitive.View>
  );
};

export type DateCalendarProps = {
  size?: Size;
  container?: RefObject<HTMLElement | null>;
  testId?: string;
};

/** The portalled calendar at `level='popup'`: zag's day, month and year views, switched by the caption. */
export const DateCalendar = ({ size, container, testId }: DateCalendarProps) => {
  const datePicker = useDatePickerContext();
  // The row (the picker's Control) is the anchor, so the calendar inherits the field's size.
  const popupSize = usePopupSize(size, datePicker.open, [datePicker.getControlProps().id]);
  return (
    <Portal container={container}>
      <DatePickerPrimitive.Positioner>
        <DatePickerPrimitive.Content
          data-surface='popup'
          data-size={popupSize}
          data-testid={testId}
          className={mx(recipes.popup(), recipes.dateCalendar())}
        >
          <DayView />
          <MonthView />
          <YearView />
        </DatePickerPrimitive.Content>
      </DatePickerPrimitive.Positioner>
    </Portal>
  );
};
