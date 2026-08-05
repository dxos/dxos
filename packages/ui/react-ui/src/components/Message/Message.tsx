//
// Copyright 2022 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithRef, type CSSProperties, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useId } from '@dxos/react-hooks';
import { type Elevation, type MessageValence } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { useElevationContext, useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { IconButton } from '../Button';
import { Column } from '../Column';
import { Icon } from '../Icon';
import { messageIcons } from './message-icons';

type MessageRootProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & {
  valence?: MessageValence;
  elevation?: Elevation;
  asChild?: boolean;
  titleId?: string;
  descriptionId?: string;
  /** Overrides the default valence icon; consumed by {@link MessageTitle}. */
  icon?: string;
};

type MessageContextValue = { titleId?: string; descriptionId: string; valence: MessageValence; icon?: string };

const MESSAGE_NAME = 'Message';

// CSS custom properties for valence color inheritance — consumed by Button variant='valence'.
// Extending CSSProperties so entries satisfy the style prop type without a cast at the use site.
type ValenceCSSVars = CSSProperties & {
  '--dx-valence-bg': string;
  '--dx-valence-bg-hover': string;
  '--dx-valence-text': string;
};

const valenceVars: Record<MessageValence, ValenceCSSVars> = {
  success: {
    '--dx-valence-bg': 'var(--color-success-bg)',
    '--dx-valence-bg-hover': 'var(--color-success-bg-hover)',
    '--dx-valence-text': 'var(--color-success-text)',
  },
  info: {
    '--dx-valence-bg': 'var(--color-info-bg)',
    '--dx-valence-bg-hover': 'var(--color-info-bg-hover)',
    '--dx-valence-text': 'var(--color-info-text)',
  },
  warning: {
    '--dx-valence-bg': 'var(--color-warning-bg)',
    '--dx-valence-bg-hover': 'var(--color-warning-bg-hover)',
    '--dx-valence-text': 'var(--color-warning-text)',
  },
  error: {
    '--dx-valence-bg': 'var(--color-error-bg)',
    '--dx-valence-bg-hover': 'var(--color-error-bg-hover)',
    '--dx-valence-text': 'var(--color-error-text)',
  },
  neutral: {
    '--dx-valence-bg': 'var(--color-neutral-bg)',
    '--dx-valence-bg-hover': 'var(--color-neutral-bg-hover)',
    '--dx-valence-text': 'var(--color-neutral-text)',
  },
};

const [MessageProvider, useMessageContext] = createContext<MessageContextValue>(MESSAGE_NAME);

//
// Root
//

const MessageRoot = forwardRef<HTMLDivElement, MessageRootProps>(
  (
    {
      asChild,
      valence = 'neutral',
      elevation: propsElevation,
      classNames,
      titleId: propsTitleId,
      descriptionId: propsDescriptionId,
      icon,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const { tx } = useThemeContext();
    const titleId = useId('message__title', propsTitleId);
    const descriptionId = useId('message__description', propsDescriptionId);
    const elevation = useElevationContext(propsElevation);

    return (
      <MessageProvider {...{ titleId, descriptionId, valence, icon }}>
        <Column.Root
          asChild={asChild}
          role={valence === 'neutral' ? 'paragraph' : 'alert'}
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          {...props}
          style={{ ...valenceVars[valence], ...(props.style || {}) }}
          classNames={tx('message.root', { valence, elevation }, classNames)}
          ref={forwardedRef}
        >
          {children}
        </Column.Root>
      </MessageProvider>
    );
  },
);

MessageRoot.displayName = MESSAGE_NAME;

//
// Content
//

type MessageContentProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & {
  asChild?: boolean;
};

const MESSAGE_CONTENT_NAME = 'Message.Content';

/**
 * Optional padded wrapper around a message's title and body — supplies the inset that hosts
 * otherwise had to add with their own wrapper `div`. Spans the root's tracks via subgrid so
 * `Message.Title` still places its icon in the gutter.
 */
const MessageContent = forwardRef<HTMLDivElement, MessageContentProps>(
  ({ asChild, classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Comp = asChild ? Slot : Primitive.div;
    return (
      <Comp {...props} className={tx('message.content', {}, classNames)} ref={forwardedRef}>
        {children}
      </Comp>
    );
  },
);

MessageContent.displayName = MESSAGE_CONTENT_NAME;

//
// Title
//

type MessageTitleProps = Omit<ThemedClassName<ComponentPropsWithRef<typeof Primitive.h2>>, 'id'> & {
  icon?: string;
  onClose?: () => void;
};

const MESSAGE_TITLE_NAME = 'Message.Title';

const MessageTitle = forwardRef<HTMLDivElement, MessageTitleProps>(
  ({ classNames, children, icon: iconProp, onClose }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const { tx } = useThemeContext();
    const { titleId, valence, icon: contextIcon } = useMessageContext(MESSAGE_TITLE_NAME);
    const icon = iconProp ?? contextIcon ?? messageIcons[valence];
    return (
      <Column.Row classNames={tx('message.header', {}, classNames)} ref={forwardedRef}>
        {icon && (
          <Column.Block>
            <Icon icon={icon} />
          </Column.Block>
        )}
        <h2 className={tx('message.title', {}, classNames)} id={titleId}>
          {children}
        </h2>
        {onClose && (
          <Column.Block end>
            <IconButton
              variant='ghost'
              icon='ph--x--regular'
              iconOnly
              density='sm'
              label={t('toolbar-close.label')}
              onClick={onClose}
            />
          </Column.Block>
        )}
      </Column.Row>
    );
  },
);

MessageTitle.displayName = MESSAGE_TITLE_NAME;

//
// Body
//

type MessageBodyProps = Omit<ThemedClassName<ComponentPropsWithRef<typeof Primitive.h2>>, 'id'> & {
  asChild?: boolean;
};

const MESSAGE_BODY_NAME = 'Message.Body';

const MessageBody = forwardRef<HTMLParagraphElement, MessageBodyProps>(
  ({ asChild, classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { descriptionId } = useMessageContext(MESSAGE_BODY_NAME);
    const Comp = asChild ? Slot : Primitive.p;
    return (
      <Comp {...props} className={tx('message.body', {}, classNames)} id={descriptionId} ref={forwardedRef}>
        {children}
      </Comp>
    );
  },
);

MessageBody.displayName = MESSAGE_BODY_NAME;

//
// Message
//

export const Message = {
  Root: MessageRoot,
  Content: MessageContent,
  Title: MessageTitle,
  Body: MessageBody,
};

export const Callout = Message;

export type { MessageBodyProps, MessageContentProps, MessageRootProps, MessageTitleProps };
