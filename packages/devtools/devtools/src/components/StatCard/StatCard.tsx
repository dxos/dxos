//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode } from 'react';

import { Button, Card, Flex, Grid, Icon, Menu, type ThemedClassName, Tooltip } from '@dxos/react-ui';
import { type Hue, getStyles, mx } from '@dxos/ui-theme';

/** An entry of a card's header menu. */
export type StatCardMenuItem = { label: string; icon?: string; onClick: () => void };

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

type StatCardRootProps = PropsWithChildren<ThemedClassName<{ id?: string }>>;

/** A compact stats card: full width so it tiles in a stack, rows hang off the card's 3-track grid. */
const StatCardRoot = ({ id, classNames, children }: StatCardRootProps) => (
  <Card.Root id={id} size='sm' grid gutter='lg' classNames={classNames}>
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
  /** One control in the end rail; several go in `menu` instead (`action` wins if both are given). */
  action?: ReactNode;
  menu?: StatCardMenuItem[];
};

/**
 * One layout for every card: the icon in the start rail, the title and optional info as a two-column grid in the content
 * track, and the button or menu in the end rail. A row rather than a `Card.Header`, so it follows the rails at any width
 * as the rows under it do; its end cell is kept when empty, so the info ends at the same edge on every card.
 */
const StatCardHeader = ({ icon, hue, title, info, action, menu }: StatCardHeaderProps) => (
  <Card.Row
    leading={<Icon icon={icon} classNames={hue && getStyles(hue).text} />}
    trailing={
      action ??
      (menu ? (
        <Card.Menu label={title}>
          {menu.map((item) => (
            <Menu.Item
              key={item.label}
              item={{ value: item.label, label: item.label, icon: item.icon }}
              onClick={item.onClick}
            />
          ))}
        </Card.Menu>
      ) : (
        <span />
      ))
    }
  >
    <Grid cols={['fill', 'auto']} gap='sm' classNames='items-center'>
      <Card.Title truncate>{title}</Card.Title>
      {info !== undefined && <span className='font-mono text-xs text-fg-muted'>{info}</span>}
    </Grid>
  </Card.Row>
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
  // Units sit in a fixed-width cell (empty when there is none), so values end on one edge across rows.
  const trailing =
    action ??
    (span && !unit ? undefined : (
      <span className='inline-block w-8 ps-1 whitespace-nowrap text-xs text-fg-muted'>{unit}</span>
    ));
  // The leading rail is kept even when empty, so labels align across rows.
  const leading =
    control ??
    (onToggle ? (
      <Button
        variant='ghost'
        icon={open ? 'ph--caret-down--regular' : 'ph--caret-right--regular'}
        iconOnly
        size='sm'
        label={open ? 'Collapse' : 'Expand'}
        onClick={() => onToggle(!open)}
      />
    ) : (
      (icon && <Icon icon={icon} classNames={iconClassNames} />) || <span />
    ));
  return (
    <Card.Row
      classNames={[classNames, onClick && 'cursor-pointer hover:bg-hover-surface', current && 'bg-hover-surface']}
      span={span && !trailing ? 'end' : undefined}
      onClick={onClick}
      current={current}
      leading={leading}
      trailing={trailing}
    >
      <Flex align='center' justify='between' gap='sm' classNames='min-w-0 text-xs'>
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

type StatCardContentProps = PropsWithChildren<
  ThemedClassName<{
    /** Run across all three tracks (both rails), for content with no label to align with, such as a chart. */
    full?: boolean;
  }>
>;

/** Content that lays itself out (a chart, a JSON block), in the content and trailing tracks under a row. */
const StatCardContent = ({ classNames, full, children }: StatCardContentProps) => (
  <Card.Row leading={full ? undefined : <span />} span={full ? 'full' : 'end'}>
    <Flex column grow={false} classNames={['min-w-0 text-xs', classNames]}>
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
