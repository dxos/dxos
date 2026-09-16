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
} from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

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
  title: string;
  /** Short figure shown after the title (a count, a status). */
  info?: ReactNode;
  /** One control in the trailing gutter; several go in `menu` instead. */
  action?: ReactNode;
  menu?: CardMenuProps['items'];
};

const StatCardHeader = ({ icon, title, info, action, menu }: StatCardHeaderProps) => (
  <Card.Header>
    <Card.Block>
      <Icon icon={icon} />
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

type StatCardRowProps = ThemedClassName<{
  /** Leading gutter icon; the gutter is kept even when empty so labels align across rows. */
  icon?: string;
  iconClassNames?: string;
  /** A disclosure row: the leading gutter holds the toggle instead of an icon. */
  open?: boolean;
  onToggle?: (open: boolean) => void;
  label?: ReactNode;
  value?: ReactNode;
  /** Shown in the trailing gutter, so values end on one edge whether or not they carry a unit. */
  unit?: string;
  /** Tooltip on the label, for the full text of a truncated row. */
  title?: string;
  /** Trailing gutter control; takes the gutter over `unit`. */
  action?: ReactNode;
  warning?: boolean;
}>;

/**
 * A label/value row: icon or disclosure toggle in the leading gutter, a unit or control in the
 * trailing one. With nothing trailing, the content runs through the trailing gutter.
 */
const StatCardRow = ({
  classNames,
  icon,
  iconClassNames,
  open,
  onToggle,
  label,
  value,
  unit,
  title,
  action,
  warning,
}: StatCardRowProps) => {
  const trailing = action ?? (unit && <span className='text-xs text-subdued'>{unit}</span>);
  return (
    <Card.Row classNames={classNames}>
      <Card.Block compact>
        {onToggle ? (
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
        )}
      </Card.Block>
      <Flex
        align='center'
        justify='between'
        gap='sm'
        classNames={['min-w-0 text-xs', !trailing && '[--dx-col:2/span_2]']}
      >
        {label !== undefined && (
          <span className='truncate' title={title}>
            {label}
          </span>
        )}
        {value !== undefined && (
          <span className={mx('shrink-0 font-mono tabular-nums', warning && 'text-error-text')}>{value}</span>
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
// Content
//

type StatCardContentProps = PropsWithChildren<ThemedClassName>;

/** A full-width row for content that lays itself out (a chart, a JSON block). */
const StatCardContent = ({ classNames, children }: StatCardContentProps) => (
  <Card.Row fullWidth classNames={classNames}>
    {children}
  </Card.Row>
);

StatCardContent.displayName = 'StatCard.Content';

export const StatCard = {
  Root: StatCardRoot,
  Header: StatCardHeader,
  Row: StatCardRow,
  Content: StatCardContent,
};

export type { StatCardContentProps, StatCardHeaderProps, StatCardRootProps, StatCardRowProps };
