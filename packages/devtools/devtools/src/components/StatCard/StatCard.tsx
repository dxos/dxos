//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, type ReactNode } from 'react';

import { Card, type CardMenuProps, Flex, Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

//
// Root
//

type StatCardRootProps = PropsWithChildren<ThemedClassName<{ id?: string }>>;

/** A compact stats card: full width so it tiles in a stack, rows hang off the card's 3-track grid. */
const StatCardRoot = ({ id, classNames, children }: StatCardRootProps) => (
  <Card.Root id={id} fullWidth classNames={classNames}>
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
  label: ReactNode;
  value?: ReactNode;
  unit?: string;
  /** Tooltip on the label, for the full text of a truncated row. */
  title?: string;
  /** Trailing gutter control. */
  action?: ReactNode;
  warning?: boolean;
}>;

/** A label/value row: icon in the leading gutter, a control in the trailing one. */
const StatCardRow = ({ classNames, icon, iconClassNames, label, value, unit, title, action, warning }: StatCardRowProps) => (
  <Card.Row classNames={classNames}>
    <Card.Block compact>{icon && <Icon icon={icon} classNames={iconClassNames} />}</Card.Block>
    <Flex align='center' justify='between' gap='sm' classNames='min-w-0 text-xs'>
      <span className='truncate' title={title}>
        {label}
      </span>
      {value !== undefined && (
        <span className={mx('shrink-0 font-mono tabular-nums', warning && 'text-error-text')}>
          {value}
          {unit && <span className='ps-1 text-subdued'>{unit}</span>}
        </span>
      )}
    </Flex>
    {action && (
      <Card.Block end compact>
        {action}
      </Card.Block>
    )}
  </Card.Row>
);

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
