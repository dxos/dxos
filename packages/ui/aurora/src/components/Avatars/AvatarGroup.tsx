//
// Copyright 2023 DXOS.org
//

import React, { ComponentPropsWithRef, forwardRef } from 'react';

import { useId } from '@dxos/react-hooks';

import { useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';
import { Avatar, AvatarRootProps, useAvatarContext } from './Avatar';

type AvatarGroupProps = Omit<AvatarRootProps, 'status' | 'maskId' | 'inGroup'> &
  ThemedClassName<ComponentPropsWithRef<'div'>>;

const AvatarGroup = forwardRef<HTMLDivElement, AvatarGroupProps>(
  (
    { labelId: propsLabelId, descriptionId: propsDescriptionId, size, variant, children, classNames }: AvatarGroupProps,
    forwardedRef,
  ) => {
    const { tx } = useThemeContext();
    const labelId = useId('avatar-group__label', propsLabelId);
    const descriptionId = useId('avatar-group__description', propsDescriptionId);
    return (
      <Avatar.Root {...{ labelId, descriptionId, size, variant, inGroup: true }}>
        <div role='group' className={tx('avatar.group', 'avatar-group', {}, classNames)} ref={forwardedRef}>
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

type AvatarGroupLabelProps = ThemedClassName<Omit<ComponentPropsWithRef<'span'>, 'id'>>;

const AvatarGroupLabel = forwardRef<HTMLSpanElement, AvatarGroupLabelProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { labelId } = useAvatarContext('AvatarGroupLabel');
    const { tx } = useThemeContext();
    return (
      <span {...props} id={labelId} className={tx('avatar.groupLabel', 'avatar-group__label', {}, classNames)}>
        {children}
      </span>
    );
  },
);

type AvatarGroupDescriptionProps = ThemedClassName<Omit<ComponentPropsWithRef<'span'>, 'id'>>;

const AvatarGroupDescription = forwardRef<HTMLSpanElement, AvatarGroupDescriptionProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { descriptionId } = useAvatarContext('AvatarGroupDescription');
    const { tx } = useThemeContext();
    return (
      <span
        {...props}
        id={descriptionId}
        className={tx('avatar.groupDescription', 'avatar-group__description', {}, classNames)}
      >
        {children}
      </span>
    );
  },
);
