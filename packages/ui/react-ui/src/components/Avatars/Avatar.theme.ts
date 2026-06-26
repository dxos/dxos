//
// Copyright 2023 DXOS.org
//

import { mx, getSize, getHeight } from '@dxos/ui-theme';
import { type ComponentFunction, type Size, type Theme } from '@dxos/ui-types';

export type AvatarStyleProps = Partial<{
  size: Size;
  srOnly: boolean;
  status: 'active' | 'inactive' | 'current' | 'error' | 'warning' | 'internal';
  animation: 'pulse' | 'none';
  variant: 'circle' | 'square';
  inGroup: boolean;
}>;

const root: ComponentFunction<AvatarStyleProps> = ({ size = 10, inGroup }, ...etc) =>
  mx(
    'relative inline-flex shrink-0',
    getSize(size),
    inGroup && (size === 'px' || size <= 3 ? '-mr-1' : '-mr-2'),
    ...etc,
  );

const label: ComponentFunction<AvatarStyleProps> = ({ srOnly }, ...etc) => mx(srOnly && 'sr-only', ...etc);

const description: ComponentFunction<AvatarStyleProps> = ({ srOnly }, ...etc) =>
  mx('text-description', srOnly && 'sr-only', ...etc);

const frame: ComponentFunction<AvatarStyleProps> = ({ variant }, ...etc) =>
  mx('h-full w-full bg-(--surface-bg)', variant === 'circle' ? 'rounded-full' : 'rounded-sm', ...etc);

const statusIcon: ComponentFunction<AvatarStyleProps> = ({ status, size = 3 }, ...etc) =>
  mx(
    'absolute bottom-0 end-0',
    getSize(size),
    status === 'inactive'
      ? 'text-amber-400 dark:text-amber-300'
      : status === 'active'
        ? 'text-emerald-400 dark:text-emerald-300'
        : 'text-neutral-400 dark:text-neutral-300',
    ...etc,
  );

const ring: ComponentFunction<AvatarStyleProps> = ({ status, variant, animation }, ...etc) =>
  mx(
    'absolute inset-0 border-2',
    variant === 'circle' ? 'rounded-full' : 'rounded-sm',
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

const fallbackText: ComponentFunction<AvatarStyleProps> = (_props, ...etc) => mx('fill-white', ...etc);

const group: ComponentFunction<AvatarStyleProps> = (_props, ...etc) => mx('inline-flex items-center', ...etc);

const groupLabel: ComponentFunction<AvatarStyleProps> = ({ size, srOnly }, ...etc) =>
  mx(
    srOnly
      ? 'sr-only'
      : 'rounded-full truncate text-sm leading-none py-1 px-2 relative z-[1] flex items-center justify-center',
    size && getHeight(size),
    ...etc,
  );

const groupDescription: ComponentFunction<AvatarStyleProps> = ({ srOnly }, ...etc) =>
  mx(srOnly ? 'sr-only' : 'text-description', ...etc);

export const avatarTheme: Theme<AvatarStyleProps> = {
  root,
  label,
  description,
  statusIcon,
  frame,
  ring,
  fallbackText,
  group,
  groupLabel,
  groupDescription,
};
