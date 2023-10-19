//
// Copyright 2022 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { type MessageValence, type Elevation } from '@dxos/react-ui-types';
import { useId } from '@dxos/react-hooks';

import { useElevationContext, useThemeContext } from '../../hooks';

type MessageRootProps = ComponentPropsWithRef<typeof Primitive.div> & {
  valence?: MessageValence;
  elevation?: Elevation;
  asChild?: boolean;
  titleId?: string;
  descriptionId?: string;
};

type MessageContextValue = { titleId?: string; descriptionId: string };
const MESSAGE_NAME = 'Message';
const [MessageProvider, useMessageContext] = createContext<MessageContextValue>(MESSAGE_NAME);

const MessageRoot = forwardRef<HTMLDivElement, MessageRootProps>(
  (
    {
      asChild,
      valence,
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
      <MessageProvider {...{ titleId, descriptionId }}>
        <Root
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
    const { titleId } = useMessageContext(MESSAGE_TITLE_NAME);
    const Root = asChild ? Slot : Primitive.h2;
    return (
      <Root {...props} className={tx('message.title', 'message__title', {}, className)} id={titleId} ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

MessageTitle.displayName = MESSAGE_TITLE_NAME;

type MessageBodyProps = Omit<ComponentPropsWithRef<typeof Primitive.h2>, 'id'> & { asChild?: boolean };

const MESSAGE_BODY_NAME = 'MessageBody';

const MessageBody = forwardRef<HTMLParagraphElement, MessageBodyProps>(
  ({ asChild, className, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { descriptionId } = useMessageContext(MESSAGE_BODY_NAME);
    const Root = asChild ? Slot : Primitive.p;
    return (
      <Root
        {...props}
        className={tx('message.body', 'message__body', {}, className)}
        id={descriptionId}
        ref={forwardedRef}
      >
        {children}
      </Root>
    );
  },
);

MessageBody.displayName = MESSAGE_BODY_NAME;

export const Message = { Root: MessageRoot, Title: MessageTitle, Body: MessageBody };

export type { MessageRootProps, MessageTitleProps, MessageBodyProps };
