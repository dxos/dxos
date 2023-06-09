//
// Copyright 2023 DXOS.org
//

import { ComponentFunction, Size, Theme } from '@dxos/aurora-types';

import { mx } from '../../util';
import { defaultDescription, getSize } from '../fragments';

export type AvatarStyleProps = Partial<{
  size: Size;
  srOnly: boolean;
  status: 'active' | 'inactive';
}>;

export const avatarRoot: ComponentFunction<AvatarStyleProps> = ({ size = 10 }, ...etc) =>
  mx('relative inline-flex', getSize(size), ...etc);

export const avatarLabel: ComponentFunction<AvatarStyleProps> = ({ srOnly }, ...etc) => mx(srOnly && 'sr-only', ...etc);
export const avatarDescription: ComponentFunction<AvatarStyleProps> = ({ srOnly }, ...etc) =>
  mx(defaultDescription, srOnly && 'sr-only', ...etc);

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

export const avatarTheme: Theme<AvatarStyleProps> = {
  root: avatarRoot,
  label: avatarLabel,
  description: avatarDescription,
  statusIcon: avatarStatusIcon,
  frame: avatarFrame,
};
