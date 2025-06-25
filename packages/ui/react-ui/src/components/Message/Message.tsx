//
// Copyright 2022 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { useId } from '@dxos/react-hooks';
import { type MessageValence, type Elevation } from '@dxos/react-ui-types';

import { useElevationContext, useThemeContext } from '../../hooks';
import { Icon } from '../Icon';

const messageIcons: Record<MessageValence, string> = {
  success: 'ph--check-circle--duotone',
  info: 'ph--info--duotone',
  warning: 'ph--warning--duotone',
  error: 'ph--warning-circle--duotone',
  neutral: 'ph--info--duotone',
};

type MessageRootProps = ComponentPropsWithRef<typeof Primitive.div> & {
  valence?: MessageValence;
  elevation?: Elevation;
  asChild?: boolean;
  titleId?: string;
  descriptionId?: string;
};

type MessageContextValue = { titleId?: string; descriptionId: string; valence: MessageValence };
const MESSAGE_NAME = 'Message';
const [MessageProvider, useMessageContext] = createContext<MessageContextValue>(MESSAGE_NAME);

const MessageRoot = forwardRef<HTMLDivElement, MessageRootProps>(
  (
    {
      asChild,
      valence = 'neutral',
      elevation: propsElevation,
      className,
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
    const Root = asChild ? Slot : Primitive.div;
    return (
      <MessageProvider {...{ titleId, descriptionId, valence }}>
        <Root
          role={valence === 'neutral' ? 'paragraph' : 'alert'}
          {...props}
          className={tx('message.root', 'message', { valence, elevation }, className)}
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          ref={forwardedRef}
        >
          {children}
        </Root>
      </MessageProvider>
    );
  },
);

MessageRoot.displayName = MESSAGE_NAME;

type MessageTitleProps = Omit<ComponentPropsWithRef<typeof Primitive.h2>, 'id'> & { asChild?: boolean };

const MESSAGE_TITLE_NAME = 'MessageTitle';

const MessageTitle = forwardRef<HTMLHeadingElement, MessageTitleProps>(
  ({ asChild, className, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { titleId, valence } = useMessageContext(MESSAGE_TITLE_NAME);
    const Root = asChild ? Slot : Primitive.h2;
    return (
      <Root {...props} className={tx('message.title', 'message__title', {}, className)} id={titleId} ref={forwardedRef}>
        <Icon size={5} icon={messageIcons[valence]} classNames={tx('message.icon', 'message__icon', { valence })} />
        <span>{children}</span>
      </Root>
    );
  },
);

MessageTitle.displayName = MESSAGE_TITLE_NAME;

type MessageContentProps = Omit<ComponentPropsWithRef<typeof Primitive.h2>, 'id'> & { asChild?: boolean };

const MESSAGE_BODY_NAME = 'MessageContent';

const MessageContent = forwardRef<HTMLParagraphElement, MessageContentProps>(
  ({ asChild, className, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { descriptionId } = useMessageContext(MESSAGE_BODY_NAME);
    const Root = asChild ? Slot : Primitive.p;
    return (
      <Root
        {...props}
        className={tx('message.content', 'message__content', {}, className)}
        id={descriptionId}
        ref={forwardedRef}
      >
        {children}
      </Root>
    );
  },
);

MessageContent.displayName = MESSAGE_BODY_NAME;

export const Message = { Root: MessageRoot, Title: MessageTitle, Content: MessageContent };

export type { MessageRootProps, MessageTitleProps, MessageContentProps };

export { messageIcons };
