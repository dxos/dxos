//
// Copyright 2026 DXOS.org
//

import React, { type JSX, type PropsWithChildren, type ReactNode } from 'react';

import { Card, Icon, IconBlock, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { DateComponent } from '../DateComponent';

//
// Root
//

const HEADER_ROOT_NAME = 'Header.Root';

type HeaderRootProps = ThemedClassName<PropsWithChildren<{ 'data-testid'?: string }>>;

/**
 * Shared header chrome for object articles (Message, Event, …). Implemented as a borderless
 * `Card` so rows align to the Card column grid (icon · content) and reuse `Card.Row`/`Card.Title`.
 */
const HeaderRoot = ({ children, classNames, ...props }: HeaderRootProps) => {
  return (
    <Card.Root border={false} fullWidth classNames={mx('p-1 border-b border-subdued-separator', classNames)} {...props}>
      <Card.Body>{children}</Card.Body>
    </Card.Root>
  );
};

HeaderRoot.displayName = HEADER_ROOT_NAME;

//
// Title
//

const HEADER_TITLE_NAME = 'Header.Title';

type HeaderTitleProps = {
  icon: string;
  title?: string;
  /** Optional secondary line rendered beneath the title (e.g. a timestamp). */
  caption?: ReactNode;
};

const HeaderTitle = ({ icon, title, caption }: HeaderTitleProps) => {
  return (
    <Card.Row icon={icon}>
      <div className='flex flex-col gap-1 overflow-hidden'>
        <h2 className='text-lg line-clamp-2'>{title}</h2>
        {caption && <div className='whitespace-nowrap text-sm text-description'>{caption}</div>}
      </div>
    </Card.Row>
  );
};

HeaderTitle.displayName = HEADER_TITLE_NAME;

//
// Date
//

const HEADER_DATE_NAME = 'Header.Date';

type HeaderDateProps = { start: Date; end?: Date };

const HeaderDate = ({ start, end }: HeaderDateProps) => {
  return (
    <Card.Row icon='ph--calendar--regular'>
      <DateComponent start={start} end={end} />
    </Card.Row>
  );
};

HeaderDate.displayName = HEADER_DATE_NAME;

//
// Row
//

const HEADER_ROW_NAME = 'Header.Row';

type HeaderRowProps = ThemedClassName<
  PropsWithChildren<{
    /** Leading element placed in the icon column — a phosphor icon name or a custom element (e.g. an icon button). */
    icon?: string | JSX.Element;
    /**
     * Render a string `icon` as a compact (content-height) block rather than a full rail-height square.
     * Use for repeated rows (e.g. attendees) so the list stays dense. Ignored for element icons.
     */
    compact?: boolean;
    'data-testid'?: string;
  }>
>;

const HeaderRow = ({ icon, compact, children, classNames, ...props }: HeaderRowProps) => {
  const resolvedIcon =
    compact && typeof icon === 'string' ? (
      <IconBlock compact square>
        <Icon icon={icon} classNames='text-subdued' size={4} />
      </IconBlock>
    ) : (
      icon
    );

  return (
    <Card.Row icon={resolvedIcon} classNames={mx('items-center', classNames)} {...props}>
      {children}
    </Card.Row>
  );
};

HeaderRow.displayName = HEADER_ROW_NAME;

//
// Header
//

export const Header = {
  Root: HeaderRoot,
  Title: HeaderTitle,
  Date: HeaderDate,
  Row: HeaderRow,
};

export type { HeaderRootProps, HeaderTitleProps, HeaderDateProps, HeaderRowProps };
