//
// Copyright 2026 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Theme } from '@dxos/ui-types';

export type DatePickerStyleProps = Partial<{
  hasValue: boolean;
}>;

const trigger: ComponentFunction<DatePickerStyleProps> = ({ hasValue }, ...etc) =>
  mx(
    'inline-flex w-fit items-center gap-2 px-2 rounded-sm border border-separator',
    'bg-input-surface text-base-fg',
    'hover:bg-hover-surface focus-visible:outline-2 focus-visible:outline-primary-500',
    !hasValue && 'text-description',
    ...etc,
  );

const content: ComponentFunction<DatePickerStyleProps> = (_p, ...etc) => mx('flex flex-col gap-2 p-2', ...etc);

const timeField: ComponentFunction<DatePickerStyleProps> = (_p, ...etc) =>
  mx(
    'flex items-center gap-2 px-2 py-1',
    '[&_input]:bg-input-surface [&_input]:border [&_input]:border-separator',
    '[&_input]:rounded-sm [&_input]:px-2 [&_input]:py-1',
    ...etc,
  );

export const datePickerTheme: Theme<DatePickerStyleProps> = {
  trigger,
  content,
  timeField,
};
