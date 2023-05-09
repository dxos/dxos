//
// Copyright 2022 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { ComponentPropsWithRef, forwardRef } from 'react';

import { MessageValence, Elevation } from '@dxos/aurora-types';
import { useId } from '@dxos/react-hooks';

import { useElevationContext, useThemeContext } from '../../hooks';

type MessageProps = ComponentPropsWithRef<typeof Primitive.div> & {
  valence?: MessageValence;
  elevation?: Elevation;
  asChild?: boolean;
};

type MessageContextValue = { titleId?: string; descriptionId: string };
const MESSAGE_NAME = 'Message';
const [MessageProvider, useMessageContext] = createContext<MessageContextValue>(MESSAGE_NAME);

const Message = forwardRef<HTMLDivElement, MessageProps>(
  ({ asChild, valence, elevation: propsElevation, className, children, ...props }) => {
    const { tx } = useThemeContext();
    const titleId = useId('message__title');
    const descriptionId = useId('message__description');
    const elevation = useElevationContext(propsElevation);
    const Root = asChild ? Slot : Primitive.div;
    return (
      <MessageProvider {...{ titleId, descriptionId }}>
        <Root
          {...props}
          className={tx('message.root', 'message', { valence, elevation }, className)}
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
        >
          {children}
        </Root>
      </MessageProvider>
    );
  }
);

Message.displayName = MESSAGE_NAME;

type MessageTitleProps = Omit<ComponentPropsWithRef<typeof Primitive.h2>, 'id'> & { asChild?: boolean };

const MESSAGE_TITLE_NAME = 'MessageTitle';

const MessageTitle = forwardRef<HTMLHeadingElement, MessageTitleProps>(({ asChild, className, children, ...props }) => {
  const { tx } = useThemeContext();
  const { titleId } = useMessageContext(MESSAGE_TITLE_NAME);
  const Root = asChild ? Slot : Primitive.h2;
  return (
    <Root {...props} className={tx('message.title', 'message__title', {}, className)} id={titleId}>
      {children}
    </Root>
  );
});

MessageTitle.displayName = MESSAGE_TITLE_NAME;

type MessageBodyProps = Omit<ComponentPropsWithRef<typeof Primitive.h2>, 'id'> & { asChild?: boolean };

const MESSAGE_BODY_NAME = 'MessageBody';

const MessageBody = forwardRef<HTMLParagraphElement, MessageBodyProps>(({ asChild, className, children, ...props }) => {
  const { tx } = useThemeContext();
  const { descriptionId } = useMessageContext(MESSAGE_BODY_NAME);
  const Root = asChild ? Slot : Primitive.p;
  return (
    <Root {...props} className={tx('message.body', 'message__body', {}, className)} id={descriptionId}>
      {children}
    </Root>
  );
});

MessageBody.displayName = MESSAGE_BODY_NAME;

export { Message, MessageTitle, MessageBody };

export type { MessageProps, MessageTitleProps, MessageBodyProps };
