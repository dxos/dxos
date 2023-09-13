//
// Copyright 2023 DXOS.org
//

import React, { ComponentPropsWithRef, forwardRef } from 'react';

import { useId } from '@dxos/react-hooks';

import { Avatar, AvatarRootProps, useAvatarContext } from './Avatar';
import { useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';

type AvatarGroupRootProps = Omit<AvatarRootProps, 'status' | 'maskId' | 'inGroup'> &
  ThemedClassName<ComponentPropsWithRef<'div'>>;

const AvatarGroupRoot = forwardRef<HTMLDivElement, AvatarGroupRootProps>(
  (
    {
      labelId: propsLabelId,
      descriptionId: propsDescriptionId,
      size,
      variant,
      children,
      classNames,
    }: AvatarGroupRootProps,
    forwardedRef,
  ) => {
    const { tx } = useThemeContext();
    const labelId = useId('avatar-group__label', propsLabelId);
    const descriptionId = useId('avatar-group__description', propsDescriptionId);
    return (
      <Avatar.Root {...{ labelId, descriptionId, size, variant, inGroup: true }}>
        <div
          role='group'
          className={tx('avatar.group', 'avatar-group', {}, classNames)}
          aria-labelledby={labelId}
          aria-describedby={descriptionId}
          ref={forwardedRef}
        >
          {children}
        </div>
      </Avatar.Root>
    );
  },
);

type AvatarGroupItemRootProps = Omit<AvatarRootProps, 'labelId' | 'descriptionId' | 'inGroup'>;

const AvatarGroupItemRoot = ({ maskId, size, variant, status, children }: AvatarGroupItemRootProps) => {
  const {
    labelId,
    descriptionId,
    size: contextSize,
    variant: contextVariant,
  } = useAvatarContext('AvatarGroupItemRoot');
  return (
    <Avatar.Root
      {...{
        labelId,
        descriptionId,
        maskId,
        status,
        size: size ?? contextSize,
        variant: variant ?? contextVariant,
        inGroup: true,
      }}
    >
      {children}
    </Avatar.Root>
  );
};

type AvatarGroupLabelProps = ThemedClassName<Omit<ComponentPropsWithRef<'span'>, 'id'>> & { srOnly?: boolean };

const AvatarGroupLabel = forwardRef<HTMLSpanElement, AvatarGroupLabelProps>(
  ({ srOnly, classNames, children, ...props }, forwardedRef) => {
    const { labelId, size } = useAvatarContext('AvatarGroupLabel');
    const { tx } = useThemeContext();
    return (
      <span
        {...props}
        id={labelId}
        className={tx('avatar.groupLabel', 'avatar-group__label', { srOnly, size }, classNames)}
      >
        {children}
      </span>
    );
  },
);

type AvatarGroupDescriptionProps = ThemedClassName<Omit<ComponentPropsWithRef<'span'>, 'id'>> & { srOnly?: boolean };

const AvatarGroupDescription = forwardRef<HTMLSpanElement, AvatarGroupDescriptionProps>(
  ({ srOnly, classNames, children, ...props }, forwardedRef) => {
    const { descriptionId } = useAvatarContext('AvatarGroupDescription');
    const { tx } = useThemeContext();
    return (
      <span
        {...props}
        id={descriptionId}
        className={tx('avatar.groupDescription', 'avatar-group__description', { srOnly }, classNames)}
      >
        {children}
      </span>
    );
  },
);

export const AvatarGroup = { Root: AvatarGroupRoot, Label: AvatarGroupLabel, Description: AvatarGroupDescription };
export const AvatarGroupItem = { Root: AvatarGroupItemRoot };
export type { AvatarGroupRootProps, AvatarGroupItemRootProps, AvatarGroupLabelProps, AvatarGroupDescriptionProps };
