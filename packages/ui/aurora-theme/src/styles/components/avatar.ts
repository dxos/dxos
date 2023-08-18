//
// Copyright 2023 DXOS.org
//

import { ComponentFunction, Size, Theme } from '@dxos/aurora-types';

import { mx } from '../../util';
import { descriptionText, getSize, getSizeHeight } from '../fragments';

export type AvatarStyleProps = Partial<{
  size: Size;
  srOnly: boolean;
  status: 'active' | 'inactive';
  inGroup: boolean;
}>;

export const avatarRoot: ComponentFunction<AvatarStyleProps> = ({ size = 10, inGroup }, ...etc) =>
  mx('relative inline-flex', getSize(size), inGroup && '-mie-2', ...etc);

export const avatarLabel: ComponentFunction<AvatarStyleProps> = ({ srOnly }, ...etc) => mx(srOnly && 'sr-only', ...etc);
export const avatarDescription: ComponentFunction<AvatarStyleProps> = ({ srOnly }, ...etc) =>
  mx(descriptionText, srOnly && 'sr-only', ...etc);

export const avatarFrame: ComponentFunction<AvatarStyleProps> = (_props, ...etc) => mx('is-full bs-full', ...etc);

export const avatarStatusIcon: ComponentFunction<AvatarStyleProps> = ({ status, size = 3 }, ...etc) =>
  mx(
    'absolute block-end-0 inline-end-0',
    getSize(size),
    status === 'inactive'
      ? 'text-warning-350 dark:text-warning-250'
      : status === 'active'
      ? 'text-success-350 dark:text-success-250'
      : 'text-neutral-350 dark:text-neutral-250',
    ...etc,
  );

export const avatarGroup: ComponentFunction<AvatarStyleProps> = (_props, ...etc) =>
  mx('inline-flex items-center', ...etc);

export const avatarGroupLabel: ComponentFunction<AvatarStyleProps> = ({ size, srOnly }, ...etc) =>
  mx(
    srOnly
      ? 'sr-only'
      : 'rounded-full truncate text-sm leading-none plb-1 pli-2 relative z-[1] flex items-center justify-center',
    size && getSizeHeight(size),
    ...etc,
  );

export const avatarGroupDescription: ComponentFunction<AvatarStyleProps> = ({ srOnly }, ...etc) =>
  mx(srOnly ? 'sr-only' : descriptionText, ...etc);

export const avatarTheme: Theme<AvatarStyleProps> = {
  root: avatarRoot,
  label: avatarLabel,
  description: avatarDescription,
  statusIcon: avatarStatusIcon,
  frame: avatarFrame,
  group: avatarGroup,
  groupLabel: avatarGroupLabel,
  groupDescription: avatarGroupDescription,
};
