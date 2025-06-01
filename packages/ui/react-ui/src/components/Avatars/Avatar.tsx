//
// Copyright 2023 DXOS.org
//

import '@dxos/lit-ui/dx-avatar.pcss';

import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentProps, type ComponentPropsWithRef, forwardRef, type PropsWithChildren } from 'react';

import {
  createComponent,
  type AvatarVariant,
  type AvatarStatus,
  type AvatarAnimation,
  DxAvatar as NaturalDxAvatar,
} from '@dxos/lit-ui';
import { useId } from '@dxos/react-hooks';
import { mx } from '@dxos/react-ui-theme';

import { useIconHref, useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

export type AvatarRootProps = PropsWithChildren<Partial<AvatarContextValue>>;

type AvatarContextValue = {
  labelId: string;
  descriptionId: string;
};

const AVATAR_NAME = 'Avatar';
const [AvatarProvider, useAvatarContext] = createContext<AvatarContextValue>(AVATAR_NAME);

const AvatarRoot = ({ children, labelId: propsLabelId, descriptionId: propsDescriptionId }: AvatarRootProps) => {
  const labelId = useId('avatar__label', propsLabelId);
  const descriptionId = useId('avatar__description', propsDescriptionId);
  return <AvatarProvider {...{ labelId, descriptionId }}>{children}</AvatarProvider>;
};

const DxAvatar = createComponent({
  tagName: 'dx-avatar',
  elementClass: NaturalDxAvatar,
  react: React,
});

type AvatarContentProps = ThemedClassName<Omit<ComponentProps<typeof DxAvatar>, 'children'>>;

const AvatarContent = forwardRef<NaturalDxAvatar, AvatarContentProps>(
  ({ icon, classNames, ...props }, forwardedRef) => {
    const href = useIconHref(icon);
    const { labelId, descriptionId } = useAvatarContext('AvatarContent');
    return (
      <DxAvatar
        {...props}
        icon={href}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        rootClassName={mx(classNames)}
        ref={forwardedRef}
      />
    );
  },
);

type AvatarLabelProps = ThemedClassName<Omit<ComponentPropsWithRef<typeof Primitive.span>, 'id'>> & {
  asChild?: boolean;
  srOnly?: boolean;
};

const AvatarLabel = forwardRef<HTMLSpanElement, AvatarLabelProps>(
  ({ asChild, srOnly, classNames, ...props }, forwardedRef) => {
    const Root = asChild ? Slot : Primitive.span;
    const { tx } = useThemeContext();
    const { labelId } = useAvatarContext('AvatarLabel');
    return (
      <Root
        {...props}
        id={labelId}
        ref={forwardedRef}
        className={tx('avatar.label', 'avatar__label', { srOnly }, classNames)}
      />
    );
  },
);

type AvatarDescriptionProps = ThemedClassName<Omit<ComponentPropsWithRef<typeof Primitive.span>, 'id'>> & {
  asChild?: boolean;
  srOnly?: boolean;
};

const AvatarDescription = forwardRef<HTMLSpanElement, AvatarDescriptionProps>(
  ({ asChild, srOnly, classNames, ...props }, forwardedRef) => {
    const Root = asChild ? Slot : Primitive.span;
    const { tx } = useThemeContext();
    const { descriptionId } = useAvatarContext('AvatarDescription');
    return (
      <Root
        {...props}
        id={descriptionId}
        ref={forwardedRef}
        className={tx('avatar.description', 'avatar__description', { srOnly }, classNames)}
      />
    );
  },
);

export const Avatar = {
  Root: AvatarRoot,
  Content: AvatarContent,
  Label: AvatarLabel,
  Description: AvatarDescription,
};

export { useAvatarContext };

export type {
  AvatarStatus,
  AvatarVariant,
  AvatarAnimation,
  AvatarContentProps,
  AvatarLabelProps,
  AvatarDescriptionProps,
  NaturalDxAvatar as DxAvatar,
};
