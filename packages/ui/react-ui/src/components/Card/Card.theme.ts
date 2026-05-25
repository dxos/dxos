//
// Copyright 2025 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Density, type Theme } from '@dxos/ui-types';

export type CardStyleProps = {
  border?: boolean;
  fullWidth?: boolean;
  srOnly?: boolean;
  variant?: 'default' | 'subtitle' | 'description';
  density?: Density;
  truncate?: boolean;
  padding?: boolean;
};

const root: ComponentFunction<CardStyleProps> = ({ border, fullWidth }, ...etc) =>
  mx(
    'dx-card dx-card-min-width dx-card-max-width min-h-(--dx-rail-item) group/card relative overflow-hidden',
    border &&
      'bg-card-surface border border-separator dark:border-subdued-separator rounded-xs dx-focus-ring-group-y-indicator',
    fullWidth && 'max-w-none!',
    ...etc,
  );

const toolbar: ComponentFunction<CardStyleProps> = (_, ...etc) =>
  mx(
    'dx-card__toolbar dx-density-md bg-transparent p-0! gap-0! col-span-3 grid! grid-cols-subgrid! [contain:none]',
    ...etc,
  );

const title: ComponentFunction<CardStyleProps> = (_props, ...etc) => mx('dx-card__title grow truncate', ...etc);

const content: ComponentFunction<CardStyleProps> = (_props, ...etc) =>
  mx('dx-card__content contents pb-1 last:pb-0', ...etc);

const text: ComponentFunction<CardStyleProps> = ({ variant = 'default', truncate: _truncate }, ...etc) =>
  mx(
    'dx-card__text items-center overflow-hidden',
    variant === 'default' && 'py-1',
    variant === 'description' && 'py-1.5 text-description',
    ...etc,
  );

const textSpan: ComponentFunction<CardStyleProps> = ({ variant = 'default', truncate }, ...etc) =>
  mx(variant === 'description' && 'text-sm text-description line-clamp-3', truncate && 'truncate', ...etc);

const poster: ComponentFunction<CardStyleProps> = (_props, ...etc) =>
  mx('dx-card__poster col-span-3 max-h-[200px]', ...etc);

const posterIcon: ComponentFunction<CardStyleProps> = (_props, ...etc) =>
  mx('dx-card__poster-icon col-span-3 grid place-items-center bg-input-surface text-subdued max-h-[200px]', ...etc);

const action: ComponentFunction<CardStyleProps> = (_props, ...etc) =>
  mx('dx-card__acztion col-span-3 !grid grid-cols-subgrid p-0! w-full text-start overflow-hidden', ...etc);

const actionLabel: ComponentFunction<CardStyleProps> = (_props, ...etc) =>
  mx('dx-card__action-label min-w-0 flex-1 truncate', ...etc);

const link: ComponentFunction<CardStyleProps> = (_props, ...etc) =>
  mx('dx-card__link col-span-3 !grid grid-cols-subgrid group p-0! dx-button dx-focus-ring min-h-1!', ...etc);

const linkLabel: ComponentFunction<CardStyleProps> = (_props, ...etc) =>
  mx('dx-card__link-label min-w-0 flex-1 truncate', ...etc);

const row: ComponentFunction<CardStyleProps> = ({ fullWidth }, ...etc) =>
  mx('dx-card__row', fullWidth ? 'col-span-full' : 'col-span-3 grid grid-cols-subgrid', ...etc);

const section: ComponentFunction<CardStyleProps> = (_props, ...etc) => mx('dx-card__section contents', ...etc);

const sectionTitle: ComponentFunction<CardStyleProps> = (_props, ...etc) =>
  mx('dx-card__section-title col-span-full py-2 text-xs text-description font-medium uppercase', ...etc);

const iconBlock: ComponentFunction<CardStyleProps> = ({ padding }, ...etc) =>
  mx(
    'dx-card__icon-block grid h-[var(--dx-rail-item)] w-[var(--dx-rail-item)] place-items-center',
    padding && '[&>*]:p-1',
    ...etc,
  );

export const cardTheme: Theme<CardStyleProps> = {
  root,
  toolbar,
  title,
  content,
  row,
  section,
  'section-title': sectionTitle,
  text,
  'text-span': textSpan,
  poster,
  'poster-icon': posterIcon,
  action,
  'action-label': actionLabel,
  link,
  'link-label': linkLabel,
  'icon-block': iconBlock,
};
