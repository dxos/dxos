//
// Copyright 2026 DXOS.org
//

import { format, intervalToDuration } from 'date-fns';
import React, { type MouseEvent, useCallback, useRef, useState } from 'react';

import { type Database, Obj } from '@dxos/echo';
import { EID, type URI } from '@dxos/keys';
import {
  Card,
  DxAnchorActivate,
  Icon,
  IconButton,
  type IconButtonProps,
  SystemIconButton,
  Tag,
  useTranslation,
} from '@dxos/react-ui';
import { type Actor, type Message } from '@dxos/types';
import { mx, toHue } from '@dxos/ui-theme';

import { useActorContact } from '../../hooks';
import { translationKey } from '../../translations';
import { Avatar, avatarName } from '../Avatar';

/**
 * Shared Card-row primitives rendered inside a `Card.Body`. These are the single source for the
 * person/date/tags/ref/star rows used across the inbox tiles (`EventStack`/`InboxStack`), the preview
 * cards (`EventCard`/`MessageCard`), and the article headers — so a row of each kind is defined exactly
 * once and every surface composes from it.
 */

//
// Card activation — internal helpers, not exported on Row.
//

/**
 * Opens an ECHO object's preview card, anchored on `trigger`. The card surface listens for
 * `DxAnchorActivate` (see `EditorMenuProvider`), so this is the same path a `dx-anchor` link takes.
 */
const activateCard = ({
  trigger,
  dxn,
  label,
  title,
}: {
  trigger: HTMLElement | null;
  dxn: URI.URI;
  label: string;
  title?: string;
}) => {
  trigger?.dispatchEvent(new DxAnchorActivate({ trigger, dxn: dxn.toString(), label, kind: 'card', title }));
};

/**
 * Delay before a hover opens a card. Long enough that crossing the avatar on the way somewhere else
 * does not fire it, short enough to feel like a hover rather than a wait.
 */
const HOVER_CARD_DELAY = 400;

/**
 * Hover intent for a card-opening trigger: `start` opens after {@link HOVER_CARD_DELAY}, `cancel`
 * aborts a pending open. Returned as bare callbacks rather than DOM props so a caller can compose
 * them with its own pointer handlers.
 */
const useCardHover = (open: () => void, enabled: boolean) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const cancel = useCallback(() => {
    if (timeoutRef.current !== undefined) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  const start = useCallback(() => {
    if (!enabled) {
      return;
    }
    cancel();
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = undefined;
      open();
    }, HOVER_CARD_DELAY);
  }, [enabled, cancel, open]);

  return { start, cancel };
};

//
// AnchorIconButton — internal helper, not exported on Row.
//

type AnchorIconButtonProps = {
  compact?: boolean;
  icon: string;
  fallbackIcon?: string;
  label: string;
  fallbackLabel?: string;
  title?: string;
  value?: URI.URI;
  size?: 4 | 5 | 6;
  /** Also open the card on hover (never the `onClick` fallback — hovering must not create anything). */
  hover?: boolean;
  onClick?: () => void;
};

/**
 * Icon-only button that opens an ECHO object's preview card via `DxAnchorActivate`.
 * Falls back to `onClick` when `value` is absent.
 */
const AnchorIconButton = ({
  compact,
  icon,
  fallbackIcon,
  label,
  fallbackLabel,
  title,
  value,
  size = 4,
  hover,
  onClick,
}: AnchorIconButtonProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const openCard = useCallback(() => {
    if (value) {
      activateCard({ trigger: buttonRef.current, dxn: value, label, title });
    }
  }, [value, label, title]);
  const { start: startHover, cancel: cancelHover } = useCardHover(openCard, !!hover && !!value);

  const handleClick = useCallback(() => {
    if (value) {
      openCard();
    } else {
      onClick?.();
    }
  }, [value, openCard, onClick]);

  return (
    <IconButton
      onPointerEnter={startHover}
      onPointerLeave={cancelHover}
      classNames={compact ? 'min-h-0' : 'aspect-square'}
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

//
// Date
//

type RowDateProps = {
  start: Date;
  end?: Date;
};

/** A Card.Row rendering a date or date range with a calendar icon. */
const RowDate = ({ start, end }: RowDateProps) => {
  let { hours = 0, minutes = 0 } = (end && intervalToDuration({ start, end })) ?? {};
  // Prefer 90m over 1h 30m.
  if (hours === 1 && minutes !== 0) {
    hours = 0;
    minutes += 60;
  }
  const duration = [hours > 0 && `${hours}h`, minutes > 0 && `${minutes}m`].filter(Boolean).join(' ');

  return (
    <Card.Row>
      <Card.Block>
        <Icon icon='ph--calendar--regular' />
      </Card.Block>
      <div className='flex items-center gap-2 overflow-hidden whitespace-nowrap'>
        <div className='truncate text-description'>{format(start, 'PPp')}</div>
        {duration.length > 0 && <div className='text-description text-xs'>({duration})</div>}
      </div>
    </Card.Row>
  );
};

RowDate.displayName = 'Row.Date';

//
// Ref
//

type RowRefProps = {
  object: Obj.Any;
};

/** A Card.Row rendering an ECHO ref/relation with a card-preview anchor icon. */
const RowRef = ({ object }: RowRefProps) => {
  const label = Obj.getLabel(object, { fallback: 'typename' }) ?? 'object';
  const icon = Obj.getIcon(object)?.icon ?? 'ph--cube--regular';
  const echoUri = EID.tryParse(Obj.getURI(object).toString());

  // TODO(burdon): Nav?
  return (
    <Card.Row>
      <Card.Block>
        <AnchorIconButton icon={icon} label={label} title={label} value={echoUri} />
      </Card.Block>
      <div className='flex items-center'>
        <span className='truncate text-primary-text'>{label}</span>
      </div>
    </Card.Row>
  );
};

RowRef.displayName = 'Row.Ref';

//
// Person
//

/** Recipient/participant kind; drives the leading icon and accessible label. */
export type PersonRole = 'from' | 'to' | 'cc' | 'bcc' | 'attendee';

type RowPersonProps = {
  actor: Actor.Actor;
  /** Recipient/participant kind (aria only; no visible prefix). */
  role?: PersonRole;
  /**
   * Resolving the actor's contact costs a query hook, so passing `db` is what opts a row into the
   * interactive avatar (hover card / create contact). Omit it in virtualized list tiles, which get the
   * hook-free static avatar instead.
   */
  db?: Database.Database;
  onContactCreate?: (actor: Actor.Actor) => void;
  /** Render a trailing remove button (e.g. attendee rows in the editable event header). */
  onRemove?: () => void;
  /** Click handler for the avatar (e.g. select the message). */
  onClick?: (event: MouseEvent) => void;
};

/**
 * Static avatar variant — no contact resolution. Suitable for virtualized list tiles.
 */
const PersonAvatarRow = ({ actor, onClick }: Pick<RowPersonProps, 'actor' | 'onClick'>) => (
  <Card.Row>
    <Card.Block>
      <Avatar actor={actor} onClick={onClick} />
    </Card.Block>
    <Card.Text>{avatarName(actor) || actor.email}</Card.Text>
  </Card.Row>
);

/**
 * Interactive variant: the gutter always shows the actor's AVATAR, and resolving their contact decides
 * what hovering it does — a Person opens that contact's card, no Person swaps the avatar for a
 * create-contact button (a click, never the hover, since hovering must not write to the space).
 *
 * Uniform across every surface that shows people, so a sender, a recipient and an attendee all read
 * the same. Separate from {@link PersonAvatarRow} only because resolving a contact costs a query hook
 * per row: a virtualized list keeps the static variant.
 */
const PersonContactRow = ({ actor, role, db, onContactCreate, onRemove, onClick }: RowPersonProps) => {
  const { t } = useTranslation(translationKey);
  const contactDXN = useActorContact(db, actor);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const openCard = useCallback(() => {
    if (contactDXN) {
      activateCard({
        trigger: anchorRef.current,
        dxn: contactDXN,
        label: t('show-contact.label'),
        title: role ? `${role}: ${actor.name ?? actor.email}` : (actor.name ?? actor.email),
      });
    }
  }, [contactDXN, t, role, actor.name, actor.email]);
  const { start: startHover, cancel: cancelHover } = useCardHover(openCard, !!contactDXN);

  const handleContactCreate = useCallback(() => onContactCreate?.(actor), [actor, onContactCreate]);

  // The button replaces the avatar in place, so the row's gutter width does not change on hover.
  const showCreate = !contactDXN && hovered && !!onContactCreate;

  return (
    <Card.Row>
      <Card.Block>
        {/* `grid place-items-center`: a plain block wrapper takes its line box (30px for a 24px
            avatar), which knocked the avatar off the gutter's centre. */}
        <div
          ref={anchorRef}
          // Pointer only when hovering does something: a resolved contact opens its card.
          className={mx('grid place-items-center', contactDXN && 'cursor-pointer')}
          data-testid='row.contact-avatar'
          onPointerEnter={() => {
            setHovered(true);
            startHover();
          }}
          onPointerLeave={() => {
            setHovered(false);
            cancelHover();
          }}
        >
          {showCreate ? (
            <IconButton
              variant='ghost'
              iconOnly
              icon='ph--user-circle-plus--regular'
              size={5}
              label={t('create-contact.label')}
              onClick={handleContactCreate}
            />
          ) : (
            <Avatar actor={actor} onClick={onClick} />
          )}
        </div>
      </Card.Block>
      <Card.Text>{avatarName(actor) || actor.email}</Card.Text>
      {onRemove && (
        <Card.Block end>
          <IconButton
            variant='ghost'
            iconOnly
            icon='ph--x--regular'
            label={t('remove-attendee.label')}
            onClick={onRemove}
          />
        </Card.Block>
      )}
    </Card.Row>
  );
};

/** A Card.Row rendering a person (sender, recipient, attendee). */
const RowPerson = ({ onClick, ...props }: RowPersonProps) =>
  props.db ? (
    <PersonContactRow {...props} onClick={onClick} />
  ) : (
    <PersonAvatarRow actor={props.actor} onClick={onClick} />
  );

RowPerson.displayName = 'Row.Person';

//
// Tags
//

type TagItem = { id: string; label?: string; hue?: string };

type RowTagsProps = {
  /** Optional — callers may pass an undefined/empty list (e.g. a message with no tags). */
  tags?: TagItem[];
  /** When provided, each chip is clickable and stops event propagation. */
  onTagClick?: (label: string) => void;
};

/** A Card.Row rendering a set of label+hue tag chips, optionally clickable. */
const RowTags = ({ tags, onTagClick }: RowTagsProps) => {
  if (!tags?.length) {
    return null;
  }

  return (
    <Card.Row>
      <Card.Block>
        <Icon icon='ph--tag--regular' />
      </Card.Block>
      <div className='flex flex-wrap gap-1 py-1 -mx-0.5' data-testid='extracted-tags'>
        {tags.map((tag) => (
          <Tag
            key={tag.id}
            hue={toHue(tag.hue)}
            data-testid={`message-tag-${tag.id}`}
            onClick={
              onTagClick
                ? (event) => {
                    event.stopPropagation();
                    onTagClick(tag.label ?? tag.id);
                  }
                : undefined
            }
          >
            {tag.label ?? tag.id}
          </Tag>
        ))}
      </div>
    </Card.Row>
  );
};

RowTags.displayName = 'Row.Tags';

//
// Attachments
//

type RowAttachmentsProps = {
  /** Optional — callers may pass an undefined/empty list (e.g. a message with no attachments). */
  attachments?: readonly Message.Attachment[];
};

/**
 * A Card.Row listing a message's attachments by name with a generic file icon. Not yet clickable —
 * resolving the attachment's ref to open/preview it is a follow-up.
 */
const RowAttachments = ({ attachments }: RowAttachmentsProps) => {
  if (!attachments?.length) {
    return null;
  }

  return (
    <Card.Row>
      <Card.Block>
        <Icon icon='ph--paperclip--regular' />
      </Card.Block>
      <div className='flex flex-wrap gap-1 py-1 -mx-0.5' data-testid='message-attachments'>
        {attachments.map((attachment) => (
          <Tag key={attachment.ref.uri} hue='neutral' classNames='inline-flex items-center gap-1'>
            <Icon icon='ph--file--regular' size={3} />
            {attachment.name ?? attachment.ref.uri}
          </Tag>
        ))}
      </div>
    </Card.Row>
  );
};

RowAttachments.displayName = 'Row.Attachments';

//
// Star
//

type RowStarProps = {
  starred?: boolean;
  /** Toggle handler; the button renders only when provided. */
  onToggle?: () => void;
};

/**
 * Star toggle for a `Card.Block` leading gutter (shared by event/message tiles and headers). Stops
 * the click from bubbling so starring doesn't also select/activate the surrounding tile or card.
 */
const RowStar = ({ starred, onToggle }: RowStarProps) => {
  const handleClick = useCallback<NonNullable<IconButtonProps['onClick']>>(
    (event) => {
      event.stopPropagation();
      onToggle?.();
    },
    [onToggle],
  );

  if (!onToggle) {
    return null;
  }

  return <SystemIconButton.Star iconOnly variant='ghost' active={starred} onClick={handleClick} />;
};

RowStar.displayName = 'Row.Star';

//
// Row
//

export const Row = {
  Date: RowDate,
  Ref: RowRef,
  Person: RowPerson,
  Tags: RowTags,
  Attachments: RowAttachments,
  Star: RowStar,
};

export type { RowAttachmentsProps, RowDateProps, RowPersonProps, RowRefProps, RowStarProps, RowTagsProps };
