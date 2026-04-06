//
// Copyright 2025 DXOS.org
//

import { type ComponentFunction, type Density, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';

export type CardStyleProps = {
  border?: boolean;
  fullWidth?: boolean;
  srOnly?: boolean;
  variant?: 'default' | 'subtitle' | 'description';
  density?: Density;
  truncate?: boolean;
  padding?: boolean;
};

const cardRoot: ComponentFunction<CardStyleProps> = ({ border, fullWidth }, ...etc) =>
  mx(
    'dx-card dx-card-min-width min-h-(--dx-rail-item) group/card relative overflow-hidden',
    border &&
      'bg-card-surface border border-separator dark:border-subdued-separator rounded-xs dx-focus-ring-group-y-indicator',
    fullWidth && 'max-w-none!',
    ...etc,
  );

const cardToolbar: ComponentFunction<CardStyleProps> = (_, ...etc) =>
  mx(
    'dx-card__toolbar dx-density-fine bg-transparent p-0! gap-0! col-span-3 grid! grid-cols-subgrid! [contain:none]',
    ...etc,
  );

const cardTitle: ComponentFunction<CardStyleProps> = (_props, ...etc) => mx('dx-card__title grow truncate', ...etc);

const cardContent: ComponentFunction<CardStyleProps> = (_props, ...etc) =>
  mx('dx-card__content contents [&>:last-child]:pb-1', ...etc);

const cardHeading: ComponentFunction<CardStyleProps> = ({ variant = 'default' }, ...etc) =>
  mx(
    'dx-card__heading',
    variant === 'default' && 'py-1',
    variant === 'subtitle' && 'py-2 text-xs text-description font-medium uppercase',
    ...etc,
  );

const cardText: ComponentFunction<CardStyleProps> = ({ variant = 'default', truncate: _truncate }, ...etc) =>
  mx(
    'dx-card__text items-center overflow-hidden',
    variant === 'default' && 'py-1',
    variant === 'description' && 'py-1.5 text-description',
    ...etc,
  );

const cardTextSpan: ComponentFunction<CardStyleProps> = ({ variant = 'default', truncate }, ...etc) =>
  mx(variant === 'description' && 'text-sm text-description line-clamp-3', truncate && 'truncate', ...etc);

const cardPoster: ComponentFunction<CardStyleProps> = (_props, ...etc) =>
  mx('dx-card__poster col-span-3 max-h-[200px]', ...etc);

const cardPosterIcon: ComponentFunction<CardStyleProps> = (_props, ...etc) =>
  mx('dx-card__poster-icon col-span-3 grid place-items-center bg-input-surface text-subdued max-h-[200px]', ...etc);

const cardAction: ComponentFunction<CardStyleProps> = (_props, ...etc) =>
  mx('dx-card__acztion col-span-3 !grid grid-cols-subgrid p-0! w-full text-start overflow-hidden', ...etc);

const cardActionLabel: ComponentFunction<CardStyleProps> = (_props, ...etc) =>
  mx('dx-card__action-label min-w-0 flex-1 truncate', ...etc);

const cardLink: ComponentFunction<CardStyleProps> = (_props, ...etc) =>
  mx('dx-card__link col-span-3 !grid grid-cols-subgrid group p-0! dx-button dx-focus-ring min-h-1!', ...etc);

const cardLinkLabel: ComponentFunction<CardStyleProps> = (_props, ...etc) =>
  mx('dx-card__link-label min-w-0 flex-1 truncate', ...etc);

const cardIconBlock: ComponentFunction<CardStyleProps> = ({ padding }, ...etc) =>
  mx(
    'dx-card__icon-block grid h-[var(--dx-rail-item)] w-[var(--dx-rail-item)] place-items-center',
    padding && '[&>*]:p-1',
    ...etc,
  );

export const cardTheme: Theme<CardStyleProps> = {
  root: cardRoot,
  toolbar: cardToolbar,
  title: cardTitle,
  content: cardContent,
  heading: cardHeading,
  text: cardText,
  'text-span': cardTextSpan,
  poster: cardPoster,
  'poster-icon': cardPosterIcon,
  action: cardAction,
  'action-label': cardActionLabel,
  link: cardLink,
  'link-label': cardLinkLabel,
  'icon-block': cardIconBlock,
};
