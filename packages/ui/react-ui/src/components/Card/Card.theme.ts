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

const root: ComponentFunction<CardStyleProps> = ({ padding, border, fullWidth }, ...etc) =>
  mx(
    'dx-card dx-card-surface dx-card-min-width dx-card-max-width min-h-(--dx-rail-item)',
    'group/card relative shrink-0 overflow-hidden',
    padding && 'p-1',
    border && 'border-2 border-separator rounded-md dx-focus-ring-group-y-indicator',
    fullWidth && 'max-w-none!',
    ...etc,
  );

const header: ComponentFunction<CardStyleProps> = (_, ...etc) =>
  mx(
    'dx-card__header col-span-3 grid grid-cols-subgrid items-center',
    '[&>*:not(.dx-gutter)]:col-start-2 [&>*:not(.dx-gutter)>*]:col-start-2',
    ...etc,
  );

const title: ComponentFunction<CardStyleProps> = (_props, ...etc) => mx('dx-card__title grow truncate', ...etc);

const body: ComponentFunction<CardStyleProps> = (_props, ...etc) => mx('dx-card__body contents', ...etc);

const block: ComponentFunction<CardStyleProps> = (_props, ...etc) => mx('dx-card__block', ...etc);

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
  mx('dx-card__poster col-span-3 max-h-[200px] select-none pointer-events-none', ...etc);

const posterIcon: ComponentFunction<CardStyleProps> = (_props, ...etc) =>
  mx('dx-card__poster-icon col-span-3 grid place-items-center bg-input-surface text-subdued max-h-[200px]', ...etc);

const action: ComponentFunction<CardStyleProps> = (_props, ...etc) =>
  mx(
    'dx-card__action col-span-3 grid grid-cols-subgrid [&>*:not(.dx-gutter)]:col-start-2 [&>*:not(.dx-gutter)>*]:col-start-2 p-0! gap-0! w-full text-start overflow-hidden',
    ...etc,
  );

const actionLabel: ComponentFunction<CardStyleProps> = (_props, ...etc) =>
  mx('dx-card__action-label min-w-0 flex-1 truncate', ...etc);

const link: ComponentFunction<CardStyleProps> = (_props, ...etc) =>
  mx(
    'dx-card__link col-span-3 grid grid-cols-subgrid [&>*:not(.dx-gutter)]:col-start-2 [&>*:not(.dx-gutter)>*]:col-start-2 group p-0! dx-button dx-focus-ring min-h-1!',
    ...etc,
  );

const linkLabel: ComponentFunction<CardStyleProps> = (_props, ...etc) =>
  mx('dx-card__link-label min-w-0 flex-1 truncate text-sm!', ...etc);

const row: ComponentFunction<CardStyleProps> = ({ fullWidth }, ...etc) =>
  mx(
    'dx-card__row overflow-hidden',
    fullWidth
      ? 'col-span-full'
      : // The `>*` selector reaches the real grid item when a content child is `display: contents`
        // (e.g. `dx-avatar`), which the direct-child selector cannot target. It is inert for normal
        // block children, whose inner nodes are not grid items of this row.
        'col-span-3 grid grid-cols-subgrid [&>*:not(.dx-gutter)]:col-start-2 [&>*:not(.dx-gutter)>*]:col-start-2',
    ...etc,
  );

// NOTE: Direct children that lack an explicit `col-*` utility default to the
// Column.Root center track (via `--dx-col`); see `ui-theme`'s `css/components/card.css`.
const section: ComponentFunction<CardStyleProps> = (_props, ...etc) =>
  mx('dx-card__section col-span-full grid grid-cols-subgrid', ...etc);

const sectionTitle: ComponentFunction<CardStyleProps> = (_props, ...etc) =>
  mx('dx-card__section-title col-start-2 col-span-full py-2 text-xs text-description font-medium uppercase', ...etc);

export const cardTheme: Theme<CardStyleProps> = {
  root,
  header,
  title,
  body,
  block,
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
};
