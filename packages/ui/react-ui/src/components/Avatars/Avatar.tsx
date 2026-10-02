//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import { ark } from '@ark-ui/react/factory';
import React, { type ComponentProps, type ComponentPropsWithRef, type PropsWithChildren, forwardRef } from 'react';

import '@dxos/lit-ui/dx-avatar.pcss';
import {
  type AvatarAnimation,
  type AvatarStatus,
  type AvatarVariant,
  type DxAvatar as NaturalDxAvatar,
} from '@dxos/lit-ui';
import { DxAvatar } from '@dxos/lit-ui/react';
import { useId } from '@dxos/react-hooks';
import { mx } from '@dxos/ui-theme';

import { useIconHref, useThemeContext } from '../../hooks/index.ts';
import { type ThemedClassName } from '../../util/index.ts';
import { type AvatarContextValue, AvatarProvider, useAvatarContext } from './AvatarContext.ts';

type AvatarRootProps = PropsWithChildren<Partial<AvatarContextValue>>;

const AvatarRoot = ({ children, labelId: propsLabelId, descriptionId: propsDescriptionId }: AvatarRootProps) => {
  const labelId = useId('avatar__label', propsLabelId);
  const descriptionId = useId('avatar__description', propsDescriptionId);
  return <AvatarProvider {...{ labelId, descriptionId }}>{children}</AvatarProvider>;
};

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

type AvatarLabelProps = ThemedClassName<Omit<ComponentPropsWithRef<typeof ark.span>, 'id'>> & {
  asChild?: boolean;
  srOnly?: boolean;
};

const AvatarLabel = forwardRef<HTMLSpanElement, AvatarLabelProps>(
  ({ asChild, srOnly, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { labelId } = useAvatarContext('AvatarLabel');
    return (
      <ark.span
        asChild={asChild}
        {...props}
        id={labelId}
        ref={forwardedRef}
        className={tx('avatar.label', { srOnly }, classNames)}
      />
    );
  },
);

type AvatarDescriptionProps = ThemedClassName<Omit<ComponentPropsWithRef<typeof ark.span>, 'id'>> & {
  asChild?: boolean;
  srOnly?: boolean;
};

const AvatarDescription = forwardRef<HTMLSpanElement, AvatarDescriptionProps>(
  ({ asChild, srOnly, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { descriptionId } = useAvatarContext('AvatarDescription');
    return (
      <ark.span
        asChild={asChild}
        {...props}
        id={descriptionId}
        ref={forwardedRef}
        className={tx('avatar.description', { srOnly }, classNames)}
      />
    );
  },
);
export type {
  AvatarAnimation as Animation,
  AvatarContentProps as ContentProps,
  AvatarDescriptionProps as DescriptionProps,
  NaturalDxAvatar as DxAvatar,
  AvatarLabelProps as LabelProps,
  AvatarStatus as Status,
  AvatarVariant as Variant,
};

export { AvatarContent as Content, AvatarDescription as Description, AvatarLabel as Label, AvatarRoot as Root };
export type { AvatarRootProps as RootProps };
export * from './Avatar.theme.ts';
export { useAvatarContext } from './AvatarContext.ts';
