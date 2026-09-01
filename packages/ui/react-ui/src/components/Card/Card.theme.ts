//
// Copyright 2025 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import { type ComponentFunction, type Density, type Theme } from '@dxos/ui-types';

import { withColumn } from '../Column/withColumn';

export type CardStyleProps = {
  border?: boolean;
  fullWidth?: boolean;
  srOnly?: boolean;
  variant?: 'default' | 'subtitle' | 'description';
  density?: Density;
  truncate?: boolean;
};

const subgrid = 'col-span-3 grid grid-cols-subgrid gap-x-1 items-center';

// Row gap comes from `Column.Root`'s `gap` prop (Card.Root defaults it to `sm`); only the
// column gap is set here — the axes are separate tailwind-merge groups, so they compose.
const root: ComponentFunction<CardStyleProps> = ({ border, fullWidth }, ...etc) =>
  mx(
    'dx-card dx-card-surface min-h-(--dx-rail-item) p-1 gap-x-1',
    // fullWidth tracks the container in both directions: the min floor would overflow containers
    // narrower than --spacing-card-min-width (phones).
    fullWidth ? 'w-full min-w-0' : 'dx-card-min-width dx-card-max-width',
    'group/card relative shrink-0 overflow-hidden',
    border && 'border-2 border-separator rounded-md dx-focus-ring-group-y-indicator',
    ...etc,
  );

const header: ComponentFunction<CardStyleProps> = (_, ...etc) =>
  mx('dx-card__header', subgrid, withColumn.placeContent(), ...etc);

const title: ComponentFunction<CardStyleProps> = (_, ...etc) => mx('dx-card__title grow truncate', ...etc);

const body: ComponentFunction<CardStyleProps> = (_, ...etc) => mx('dx-card__body contents', ...etc);

const block: ComponentFunction<CardStyleProps> = (_, ...etc) => mx('dx-card__block', ...etc);

const text: ComponentFunction<CardStyleProps> = ({ variant = 'default', truncate: _truncate }, ...etc) =>
  mx(
    'dx-card__text items-center overflow-hidden',
    variant === 'default' && 'py-1',
    variant === 'description' && 'py-1.5 text-description',
    ...etc,
  );

const textSpan: ComponentFunction<CardStyleProps> = ({ variant = 'default', truncate }, ...etc) =>
  mx(variant === 'description' && 'text-sm text-description line-clamp-3', truncate && 'truncate', ...etc);

const poster: ComponentFunction<CardStyleProps> = (_, ...etc) =>
  mx('dx-card__poster col-span-3 max-h-[200px] select-none pointer-events-none', ...etc);

const posterIcon: ComponentFunction<CardStyleProps> = (_, ...etc) =>
  mx('dx-card__poster-icon col-span-3 grid place-items-center bg-input-surface text-subdued max-h-[200px]', ...etc);

const action: ComponentFunction<CardStyleProps> = (_, ...etc) =>
  mx(
    mx('dx-card__action', subgrid, withColumn.placeContent(), 'p-0! gap-0! w-full text-start overflow-hidden'),
    ...etc,
  );

const actionLabel: ComponentFunction<CardStyleProps> = (_, ...etc) =>
  mx('dx-card__action-label min-w-0 flex-1 truncate', ...etc);

// Holds the label and its annotation in one grid cell: `action` puts every child in column 2,
// so siblings would otherwise stack onto separate rows.
const actionContent: ComponentFunction<CardStyleProps> = (_, ...etc) =>
  mx('dx-card__action-content flex-1 flex items-baseline gap-2 overflow-hidden', ...etc);

// Never shrinks: the label truncates around it, so a long subject cannot squeeze the annotation out.
const actionAnnotation: ComponentFunction<CardStyleProps> = (_, ...etc) =>
  mx('dx-card__action-annotation shrink-0 text-xs text-description tabular-nums', ...etc);

const link: ComponentFunction<CardStyleProps> = (_, ...etc) =>
  mx(mx('dx-card__link', subgrid, withColumn.placeContent(), 'group p-0! dx-button dx-focus-ring min-h-1!'), ...etc);

const linkLabel: ComponentFunction<CardStyleProps> = (_, ...etc) =>
  mx('dx-card__link-label min-w-0 flex-1 truncate text-sm!', ...etc);

const row: ComponentFunction<CardStyleProps> = ({ fullWidth }, ...etc) =>
  mx(
    // No `overflow-hidden`: focus rings are drawn outside the border box (`.dx-input` uses
    // `ring-offset`), so clipping here severs the ring of any focusable control in the row —
    // `Column.Row` carries the same note. Children that need to clip do it themselves (`truncate`).
    'dx-card__row',
    fullWidth
      ? 'col-span-full'
      : // The `>*` selector reaches the real grid item when a content child is `display: contents`
        // (e.g. `dx-avatar`), which the direct-child selector cannot target. It is inert for normal
        // block children, whose inner nodes are not grid items of this row.
        mx(subgrid, withColumn.placeContent()),
    ...etc,
  );

// NOTE: Direct children that lack an explicit `col-*` utility default to the
// Column.Root center track (via `--dx-col`); see `ui-theme`'s `css/components/card.css`.
const section: ComponentFunction<CardStyleProps> = (_, ...etc) => mx('dx-card__section', subgrid, ...etc);

const sectionTitle: ComponentFunction<CardStyleProps> = (_, ...etc) =>
  mx('dx-card__section-title col-start-2 col-span-full py-2 text-xs text-description font-medium uppercase', ...etc);

export const cardTheme: Theme<CardStyleProps> = {
  'root': root,
  'header': header,
  'title': title,
  'body': body,
  'block': block,
  'row': row,
  'section': section,
  'section-title': sectionTitle,
  'text': text,
  'text-span': textSpan,
  'poster': poster,
  'poster-icon': posterIcon,
  'action': action,
  'action-label': actionLabel,
  'action-content': actionContent,
  'action-annotation': actionAnnotation,
  'link': link,
  'link-label': linkLabel,
};
