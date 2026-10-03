//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode } from 'react';

import {
  Card,
  type CardMenuProps,
  type CardRootProps,
  Flex,
  Icon,
  IconButton,
  type ThemedClassName,
  Tooltip,
} from '@dxos/react-ui';
import { type Hue, getStyles, mx } from '@dxos/ui-theme';

/** One hue per category of card, so a stack reads by colour before it reads by title. */
export const STAT_CARD_HUES = {
  /** Rendering: surfaces, frame rate. */
  ui: 'violet',
  /** ECHO: database, replication, queries, sync. */
  database: 'emerald',
  /** EDGE services and the swarm. */
  edge: 'blue',
  /** The host: memory, network, performance, plugin stats. */
  system: 'amber',
} as const satisfies Record<string, Hue>;

//
// Root
//

type StatCardRootProps = PropsWithChildren<ThemedClassName<{ id?: string; density?: CardRootProps['density'] }>>;

/** A compact stats card: full width so it tiles in a stack, rows hang off the card's 3-track grid. */
const StatCardRoot = ({ id, density = 'sm', classNames, children }: StatCardRootProps) => (
  <Card.Root id={id} density={density} fullWidth classNames={classNames}>
    {children}
  </Card.Root>
);

StatCardRoot.displayName = 'StatCard.Root';

//
// Header
//

type StatCardHeaderProps = {
  icon: string;
  /** Tints the icon, so a stack of cards reads by colour before it reads by title. */
  hue?: Hue;
  title: string;
  /** Short figure shown after the title (a count, a status). */
  info?: ReactNode;
  /** One control in the trailing gutter; several go in `menu` instead. */
  action?: ReactNode;
  menu?: CardMenuProps['items'];
};

const StatCardHeader = ({ icon, hue, title, info, action, menu }: StatCardHeaderProps) => (
  <Card.Header>
    <Card.Block>
      <Icon icon={icon} classNames={hue && getStyles(hue).text} />
    </Card.Block>
    <Flex align='center' gap='sm' classNames='min-w-0'>
      <Card.Title>{title}</Card.Title>
      {info !== undefined && <span className='shrink-0 font-mono text-xs text-description'>{info}</span>}
    </Flex>
    {action && <Card.Block end>{action}</Card.Block>}
    {menu && <Card.Menu items={menu} />}
  </Card.Header>
);

StatCardHeader.displayName = 'StatCard.Header';

//
// Row
//

type StatCardRowProps = PropsWithChildren<
  ThemedClassName<{
    /** Leading gutter icon; the gutter is kept even when empty so labels align across rows. */
    icon?: string;
    iconClassNames?: string;
    /** Leading gutter control (a switch); takes the gutter over `icon` and the disclosure toggle. */
    control?: ReactNode;
    /** A disclosure row: the leading gutter holds the toggle instead of an icon. */
    open?: boolean;
    onToggle?: (open: boolean) => void;
    /** The row's text; omitted when `children` lay the content out themselves. */
    label?: ReactNode;
    value?: ReactNode;
    /** Shown in the trailing gutter, so values end on one edge whether or not they carry a unit. */
    unit?: string;
    /** Tooltip on the label, for the full text of a truncated row or more detail. */
    tooltip?: ReactNode;
    /** Trailing gutter control; takes the gutter over `unit`. */
    action?: ReactNode;
    /** Run the content through the trailing gutter (columns 2–3); by default it stays in the content track so values line up. */
    span?: boolean;
    warning?: boolean;
    /** A selectable row: clicking it reports, and `current` marks the selected one. */
    onClick?: () => void;
    current?: boolean;
  }>
>;

/**
 * A label/value row: icon, disclosure toggle or control in the leading gutter, a unit or control in
 * the trailing one. `span` runs the content through the trailing gutter — via an explicit
 * `grid-column-end`, since `Card.Row` places its children by `col-start` only. `children`
 * replace the label/value pair for rows that need their own columns (a `Grid`).
 */
const StatCardRow = ({
  classNames,
  icon,
  iconClassNames,
  control,
  open,
  onToggle,
  label,
  value,
  unit,
  tooltip,
  action,
  span,
  warning,
  onClick,
  current,
  children,
}: StatCardRowProps) => {
  const trailing = action ?? (unit && <span className='text-xs text-description'>{unit}</span>);
  return (
    <Card.Row
      classNames={[classNames, onClick && 'cursor-pointer hover:bg-hover-surface', current && 'bg-hover-surface']}
      onClick={onClick}
      current={current}
    >
      <Card.Block compact>
        {control ??
          (onToggle ? (
            <IconButton
              variant='ghost'
              icon={open ? 'ph--caret-down--regular' : 'ph--caret-right--regular'}
              iconOnly
              density='sm'
              label={open ? 'Collapse' : 'Expand'}
              onClick={() => onToggle(!open)}
            />
          ) : (
            icon && <Icon icon={icon} classNames={iconClassNames} />
          ))}
      </Card.Block>
      <Flex
        align='center'
        justify='between'
        gap='sm'
        classNames={['min-w-0 text-xs', span && !trailing && '[grid-column-end:span_2]']}
      >
        {children ?? (
          <>
            {tooltip ? (
              <Tooltip.Trigger asChild content={tooltip}>
                <span className='truncate'>{label}</span>
              </Tooltip.Trigger>
            ) : (
              <span className='truncate'>{label}</span>
            )}
            {value !== undefined && (
              <span className={mx('shrink-0 font-mono tabular-nums', warning && 'text-error-text')}>{value}</span>
            )}
          </>
        )}
      </Flex>
      {trailing && (
        // A unit reads on from its value, so it sits at the gutter's start; a control stays centred.
        <Card.Block end compact classNames={!action && 'justify-items-start'}>
          {trailing}
        </Card.Block>
      )}
    </Card.Row>
  );
};

StatCardRow.displayName = 'StatCard.Row';

//
// Section
//

type StatCardSectionProps = PropsWithChildren<{ title: string }>;

/** A titled group of rows, for a card whose rows are of more than one kind. */
const StatCardSection = ({ title, children }: StatCardSectionProps) => (
  <Card.Section title={title}>{children}</Card.Section>
);

StatCardSection.displayName = 'StatCard.Section';

//
// Content
//

type StatCardContentProps = PropsWithChildren<ThemedClassName>;

/** Content that lays itself out (a chart, a JSON block), in the content and trailing tracks under a row. */
const StatCardContent = ({ classNames, children }: StatCardContentProps) => (
  <Card.Row>
    <Flex column grow={false} classNames={['min-w-0 text-xs [grid-column-end:span_2]', classNames]}>
      {children}
    </Flex>
  </Card.Row>
);

StatCardContent.displayName = 'StatCard.Content';

export const StatCard = {
  Root: StatCardRoot,
  Header: StatCardHeader,
  Row: StatCardRow,
  Section: StatCardSection,
  Content: StatCardContent,
};

export type { StatCardContentProps, StatCardHeaderProps, StatCardRootProps, StatCardRowProps, StatCardSectionProps };
