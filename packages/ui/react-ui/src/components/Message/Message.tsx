//
// Copyright 2022 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type CSSProperties, type ComponentPropsWithRef, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useId } from '@dxos/react-hooks';
import { type Elevation, type MessageValence } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { useElevationContext, useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { IconButton } from '../Button';
import { Column } from '../Column';
import { Icon } from '../Icon';

const messageIcons: Record<MessageValence, string> = {
  success: 'ph--check-circle--duotone',
  info: 'ph--info--duotone',
  warning: 'ph--warning--duotone',
  error: 'ph--warning-circle--duotone',
  neutral: 'ph--info--duotone',
};

type MessageRootProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & {
  valence?: MessageValence;
  elevation?: Elevation;
  asChild?: boolean;
  titleId?: string;
  descriptionId?: string;
};

type MessageContextValue = { titleId?: string; descriptionId: string; valence: MessageValence };

const MESSAGE_NAME = 'Message';

const valenceVars: Record<MessageValence, CSSProperties> = {
  success: {
    '--dx-valence-bg': 'var(--color-success-bg)',
    '--dx-valence-bg-hover': 'var(--color-success-bg-hover)',
    '--dx-valence-fg': 'var(--color-success-fg)',
  } as CSSProperties,
  info: {
    '--dx-valence-bg': 'var(--color-info-bg)',
    '--dx-valence-bg-hover': 'var(--color-info-bg-hover)',
    '--dx-valence-fg': 'var(--color-info-fg)',
  } as CSSProperties,
  warning: {
    '--dx-valence-bg': 'var(--color-warning-bg)',
    '--dx-valence-bg-hover': 'var(--color-warning-bg-hover)',
    '--dx-valence-fg': 'var(--color-warning-fg)',
  } as CSSProperties,
  error: {
    '--dx-valence-bg': 'var(--color-error-bg)',
    '--dx-valence-bg-hover': 'var(--color-error-bg-hover)',
    '--dx-valence-fg': 'var(--color-error-fg)',
  } as CSSProperties,
  neutral: {
    '--dx-valence-bg': 'var(--color-neutral-bg)',
    '--dx-valence-bg-hover': 'var(--color-neutral-bg-hover)',
    '--dx-valence-fg': 'var(--color-neutral-fg)',
  } as CSSProperties,
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
      <MessageProvider {...{ titleId, descriptionId, valence }}>
        <Column.Root
          asChild={asChild}
          role={valence === 'neutral' ? 'paragraph' : 'alert'}
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          {...props}
          style={valenceVars[valence]}
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
    const { titleId, valence } = useMessageContext(MESSAGE_TITLE_NAME);
    const icon = iconProp ?? messageIcons[valence];
    return (
      <Column.Row classNames={tx('message.header', {}, classNames)} ref={forwardedRef}>
        {icon && (
          <div className={tx('message.icon', { valence })}>
            <Icon icon={icon} size={5} />
          </div>
        )}
        <h2 className={tx('message.title', {}, classNames)} id={titleId}>
          {children}
        </h2>
        {onClose && (
          <IconButton
            variant='ghost'
            icon='ph--x--regular'
            iconOnly
            label={t('toolbar-close.label')}
            classNames={tx('message.close', {})}
            onClick={onClose}
          />
        )}
      </Column.Row>
    );
  },
);

MessageTitle.displayName = MESSAGE_TITLE_NAME;

//
// Content
//

type MessageContentProps = Omit<ThemedClassName<ComponentPropsWithRef<typeof Primitive.h2>>, 'id'> & {
  asChild?: boolean;
};

const MESSAGE_CONTENT_NAME = 'Message.Content';

const MessageContent = forwardRef<HTMLParagraphElement, MessageContentProps>(
  ({ asChild, classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { descriptionId } = useMessageContext(MESSAGE_CONTENT_NAME);
    const Comp = asChild ? Slot : Primitive.p;
    return (
      <Comp {...props} className={tx('message.content', {}, classNames)} id={descriptionId} ref={forwardedRef}>
        {children}
      </Comp>
    );
  },
);

MessageContent.displayName = MESSAGE_CONTENT_NAME;

//
// Message
//

export const Message = {
  Root: MessageRoot,
  Title: MessageTitle,
  Content: MessageContent,
};

export const Callout = Message;

export type { MessageRootProps, MessageTitleProps, MessageContentProps };

export { messageIcons };
