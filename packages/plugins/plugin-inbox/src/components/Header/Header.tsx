//
// Copyright 2026 DXOS.org
//

import React, { type JSX, type PropsWithChildren, type ReactNode, useCallback, useRef } from 'react';

import { Obj, type Database } from '@dxos/echo';
import { EID, type URI } from '@dxos/keys';
import {
  Card,
  DxAnchorActivate,
  Icon,
  IconBlock,
  type IconBlockProps,
  IconButton,
  type ThemedClassName,
  useTranslation,
} from '@dxos/react-ui';
import { type Actor } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { useActorContact } from '#hooks';
import { meta } from '#meta';

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
// AnchorIconButton
//

const HEADER_ANCHOR_ICON_BUTTON_NAME = 'Header.AnchorIconButton';

/**
 * Icon-only button that opens an ECHO object's preview card via `DxAnchorActivate`.
 * When `value` is missing the button falls back to `onClick` for a "create"-style action.
 */
export type AnchorIconButtonProps = ThemedClassName<{
  /** Phosphor icon shown when `value` is present. */
  icon: string;
  /** Phosphor icon shown when `value` is absent. Defaults to `icon`. */
  fallbackIcon?: string;
  /** Accessible label when `value` is present. */
  label: string;
  /** Accessible label when `value` is absent. Defaults to `label`. */
  fallbackLabel?: string;
  /** DXN of the target object — opens the card preview on click via `DxAnchorActivate`. */
  value?: URI.URI;
  /** Optional title passed to the DxAnchorActivate event (shown in the preview header). */
  title?: string;
  /** Fallback action when no `value` is provided. */
  onClick?: () => void;
  /** IconButton size; defaults to 4. */
  size?: 4 | 5 | 6;
}>;

const HeaderAnchorIconButton = ({
  classNames,
  icon,
  fallbackIcon,
  label,
  fallbackLabel,
  value,
  title,
  onClick,
  size = 4,
}: AnchorIconButtonProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const handleClick = useCallback(() => {
    if (value) {
      buttonRef.current?.dispatchEvent(
        new DxAnchorActivate({
          trigger: buttonRef.current,
          dxn: value.toString(),
          label: 'never',
          kind: 'card',
          title,
        }),
      );
    } else {
      onClick?.();
    }
  }, [value, title, onClick]);

  return (
    <IconButton
      classNames={classNames}
      variant='ghost'
      disabled={!value && !onClick}
      icon={value ? icon : (fallbackIcon ?? icon)}
      iconOnly
      size={size}
      label={value ? label : (fallbackLabel ?? label)}
      onClick={handleClick}
      ref={buttonRef}
    />
  );
};

HeaderAnchorIconButton.displayName = HEADER_ANCHOR_ICON_BUTTON_NAME;

//
// UserIconButton
//

const HEADER_USER_ICON_BUTTON_NAME = 'Header.UserIconButton';

export type UserIconButtonProps = Pick<IconBlockProps, 'compact'> & {
  value?: URI.URI;
  title?: string;
  onContactCreate?: () => void;
};

// TODO(burdon): Reconcile with Avatar if space member.
const HeaderUserIconButton = ({ compact, value, title, onContactCreate }: UserIconButtonProps) => {
  const { t } = useTranslation(meta.id);
  return (
    <IconBlock compact={compact}>
      <HeaderAnchorIconButton
        classNames={compact && 'min-h-0'}
        value={value}
        title={title}
        icon='ph--user--regular'
        label={t('show-contact.label')}
        fallbackIcon='ph--user-plus--regular'
        fallbackLabel={t('create-contact.label')}
        onClick={onContactCreate}
      />
    </IconBlock>
  );
};

HeaderUserIconButton.displayName = HEADER_USER_ICON_BUTTON_NAME;

//
// ObjectRow
//

const HEADER_OBJECT_ROW_NAME = 'Header.ObjectRow';

/** A row that renders an extracted ECHO object — icon button opening the object's card preview. */
const HeaderObjectRow = ({ object }: { object: Obj.Any }) => {
  const label = Obj.getLabel(object, { fallback: 'typename' }) ?? 'object';
  const icon = Obj.getIcon(object)?.icon ?? 'ph--cube--regular';
  const echoUri = EID.tryParse(Obj.getURI(object).toString());

  return (
    <HeaderRow
      icon={<HeaderAnchorIconButton icon={icon} label={label} title={label} value={echoUri} />}
      data-testid={`extracted-tag-${object.id}`}
    >
      <h3 className='truncate text-primary-text'>{label}</h3>
    </HeaderRow>
  );
};

HeaderObjectRow.displayName = HEADER_OBJECT_ROW_NAME;

//
// AttendeeRow
//

const HEADER_ATTENDEE_ROW_NAME = 'Header.AttendeeRow';

export type AttendeeRowProps = {
  attendee: Actor.Actor;
  db?: Database.Database;
  onContactCreate?: (actor: Actor.Actor) => void;
};

/** A row that renders an event attendee with a user icon button. */
const HeaderAttendeeRow = ({ attendee, db, onContactCreate }: AttendeeRowProps) => {
  const contactDXN = useActorContact(db, attendee);
  const handleContactCreate = useCallback(() => onContactCreate?.(attendee), [attendee]);

  return (
    <HeaderRow
      icon={
        <HeaderUserIconButton compact title={attendee.name} value={contactDXN} onContactCreate={handleContactCreate} />
      }
    >
      <h3 className='truncate'>{attendee.name || attendee.email}</h3>
    </HeaderRow>
  );
};

HeaderAttendeeRow.displayName = HEADER_ATTENDEE_ROW_NAME;

//
// Header
//

export const Header = {
  Root: HeaderRoot,
  Title: HeaderTitle,
  Date: HeaderDate,
  Row: HeaderRow,
  AnchorIconButton: HeaderAnchorIconButton,
  UserIconButton: HeaderUserIconButton,
  ObjectRow: HeaderObjectRow,
  AttendeeRow: HeaderAttendeeRow,
};

export type { HeaderRootProps, HeaderTitleProps, HeaderDateProps, HeaderRowProps };
