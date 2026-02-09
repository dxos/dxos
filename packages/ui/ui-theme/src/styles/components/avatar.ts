//
// Copyright 2023 DXOS.org
//

import { type ComponentFunction, type Size, type Theme } from '@dxos/ui-types';

import { mx } from '../../util';
import { descriptionText, getSize, getSizeHeight } from '../fragments';

export type AvatarStyleProps = Partial<{
  size: Size;
  srOnly: boolean;
  status: 'active' | 'inactive' | 'current' | 'error' | 'warning' | 'internal';
  animation: 'pulse' | 'none';
  variant: 'circle' | 'square';
  inGroup: boolean;
}>;

export const avatarRoot: ComponentFunction<AvatarStyleProps> = ({ size = 10, inGroup }, ...etc) =>
  mx(
    'relative inline-flex shrink-0',
    getSize(size),
    inGroup && (size === 'px' || size <= 3 ? '-mie-1' : '-mie-2'),
    ...etc,
  );

export const avatarLabel: ComponentFunction<AvatarStyleProps> = ({ srOnly }, ...etc) => mx(srOnly && 'sr-only', ...etc);

export const avatarDescription: ComponentFunction<AvatarStyleProps> = ({ srOnly }, ...etc) =>
  mx(descriptionText, srOnly && 'sr-only', ...etc);

export const avatarFrame: ComponentFunction<AvatarStyleProps> = ({ variant }, ...etc) =>
  mx('is-full bs-full bg-[--surface-bg]', variant === 'circle' ? 'rounded-full' : 'rounded', ...etc);

export const avatarStatusIcon: ComponentFunction<AvatarStyleProps> = ({ status, size = 3 }, ...etc) =>
  mx(
    'absolute block-end-0 inline-end-0',
    getSize(size),
    status === 'inactive'
      ? 'text-amber-350 dark:text-amber-250'
      : status === 'active'
        ? 'text-emerald-350 dark:text-emerald-250'
        : 'text-neutral-350 dark:text-neutral-250',
    ...etc,
  );

export const avatarRing: ComponentFunction<AvatarStyleProps> = ({ status, variant, animation }, ...etc) =>
  mx(
    'absolute inset-0 border-2',
    variant === 'circle' ? 'rounded-full' : 'rounded',
    status === 'current'
      ? 'border-primary-400 dark:border-primary-500'
      : status === 'active'
        ? 'border-emerald-400 dark:border-emerald-400'
        : status === 'error'
          ? 'border-rose-400 dark:border-rose-500'
          : status === 'warning'
            ? 'border-amber-400 dark:border-amber-500'
            : status === 'inactive'
              ? 'border-separator'
              : status === 'internal'
                ? 'border-fuchsia-600'
                : 'border-[color:var(--surface-bg)]',
    animation === 'pulse' ? 'animate-halo-pulse' : '',
    ...etc,
  );

export const avatarFallbackText: ComponentFunction<AvatarStyleProps> = (_props, ...etc) => mx('fill-white', ...etc);

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
  ring: avatarRing,
  fallbackText: avatarFallbackText,
  group: avatarGroup,
  groupLabel: avatarGroupLabel,
  groupDescription: avatarGroupDescription,
};
