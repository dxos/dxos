//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import { Obj, type Database } from '@dxos/echo';
import { EID, type URI } from '@dxos/keys';
import { Card, DxAnchorActivate, IconBlock, IconButton, useTranslation } from '@dxos/react-ui';
import { type Actor } from '@dxos/types';

import { useActorContact } from '#hooks';
import { meta } from '#meta';

import { DateComponent } from '../DateComponent';

// AnchorIconButton — internal helper, not exported on Header.

type AnchorIconButtonProps = {
  classNames?: string;
  icon: string;
  fallbackIcon?: string;
  label: string;
  fallbackLabel?: string;
  value?: URI.URI;
  title?: string;
  onClick?: () => void;
  size?: 4 | 5 | 6;
};

/**
 * Icon-only button that opens an ECHO object's preview card via `DxAnchorActivate`.
 * Falls back to `onClick` when `value` is absent.
 */
const AnchorIconButton = ({
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

// DateRow

/** A Card.Row rendering a date range with a calendar icon. */
const HeaderDateRow = ({ start, end }: { start: Date; end?: Date }) => (
  <Card.Row icon='ph--calendar--regular'>
    <DateComponent start={start} end={end} />
  </Card.Row>
);

HeaderDateRow.displayName = 'Header.DateRow';

// ObjectRow

/** A Card.Row rendering an extracted ECHO object with a card-preview anchor icon. */
const HeaderObjectRow = ({ object }: { object: Obj.Any }) => {
  const label = Obj.getLabel(object, { fallback: 'typename' }) ?? 'object';
  const icon = Obj.getIcon(object)?.icon ?? 'ph--cube--regular';
  const echoUri = EID.tryParse(Obj.getURI(object).toString());

  return (
    <Card.Row
      icon={<AnchorIconButton icon={icon} label={label} title={label} value={echoUri} />}
      data-testid={`extracted-tag-${object.id}`}
    >
      <h3 className='truncate text-primary-text'>{label}</h3>
    </Card.Row>
  );
};

HeaderObjectRow.displayName = 'Header.ObjectRow';

// PersonRow

type PersonRowProps = {
  actor: Actor.Actor;
  db?: Database.Database;
  onContactCreate?: (actor: Actor.Actor) => void;
};

// TODO(burdon): Reconcile with Avatar if space member.
/** A Card.Row rendering a person (sender, attendee) with a contact anchor icon. */
const HeaderPersonRow = ({ actor, db, onContactCreate }: PersonRowProps) => {
  const { t } = useTranslation(meta.id);
  const contactDXN = useActorContact(db, actor);
  const handleContactCreate = useCallback(() => onContactCreate?.(actor), [actor, onContactCreate]);

  return (
    <Card.Row
      icon={
        <IconBlock compact>
          <AnchorIconButton
            classNames='min-h-0'
            value={contactDXN}
            title={actor.name}
            icon='ph--user--regular'
            label={t('show-contact.label')}
            fallbackIcon='ph--user-plus--regular'
            fallbackLabel={t('create-contact.label')}
            onClick={handleContactCreate}
          />
        </IconBlock>
      }
    >
      <h3 className='truncate'>{actor.name || actor.email}</h3>
    </Card.Row>
  );
};

HeaderPersonRow.displayName = 'Header.PersonRow';

//

export const Header = {
  DateRow: HeaderDateRow,
  ObjectRow: HeaderObjectRow,
  PersonRow: HeaderPersonRow,
};

export type { PersonRowProps };
