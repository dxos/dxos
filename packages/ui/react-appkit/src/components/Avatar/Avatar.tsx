//
// Copyright 2022 DXOS.org
//

import React, {
  type ComponentProps,
  type ForwardedRef,
  forwardRef,
  type PropsWithChildren,
  type ReactHTMLElement,
  type ReactNode,
} from 'react';

import {
  type AvatarFallbackProps,
  type Size,
  Avatar as NaturalAvatar,
  useJdenticonHref,
  type AvatarFrameProps,
} from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

export interface AvatarSlots {
  root?: Omit<AvatarFrameProps, 'children'>;
  image?: ComponentProps<'image'>;
  fallback?: Omit<AvatarFallbackProps, 'children'>;
  labels?: Omit<ComponentProps<'div'>, 'children' | 'ref'>;
}

interface SharedAvatarProps {
  fallbackValue: string;
  label?: string | Omit<ReactHTMLElement<HTMLElement>, 'ref'> | JSX.Element;
  description?: string | Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
  labelId?: string;
  descriptionId?: string;
  size?: Size;
  variant?: 'square' | 'circle';
  status?: 'active' | 'inactive';
  mediaSrc?: string;
  mediaAlt?: string;
  children?: ReactNode;
  slots?: AvatarSlots;
}

interface DirectlyLabeledAvatarProps extends Omit<SharedAvatarProps, 'label'> {
  label: string | Omit<ReactHTMLElement<HTMLElement>, 'ref'> | JSX.Element;
}

interface IdLabeledAvatarProps extends Omit<SharedAvatarProps, 'labelId'> {
  labelId?: string; // TODO(dmaretskyi): Fix typing.
}

export type AvatarProps = DirectlyLabeledAvatarProps | IdLabeledAvatarProps;

/**
 * @deprecated please use `Avatar` from ui/aurora.
 */
export const Avatar = forwardRef(
  (
    {
      mediaSrc,
      mediaAlt,
      fallbackValue,
      label,
      labelId: propsLabelId,
      descriptionId: propsDescriptionId,
      description,
      variant = 'square',
      status,
      size = 10,
      slots = {},
    }: PropsWithChildren<AvatarProps>,
    ref: ForwardedRef<HTMLSpanElement>,
  ) => {
    const jdenticon = useJdenticonHref(fallbackValue, size);
    return (
      <>
        <NaturalAvatar.Root labelId={propsLabelId} descriptionId={propsDescriptionId} {...{ size, variant, status }}>
          <NaturalAvatar.Frame {...slots.root} ref={ref}>
            {mediaSrc && <NaturalAvatar.Image href={mediaSrc} />}
            <NaturalAvatar.Fallback delayMs={0} href={jdenticon} />
          </NaturalAvatar.Frame>
          <div role='none' {...slots.labels} className={mx('contents', slots?.labels?.className)}>
            <NaturalAvatar.Label asChild={typeof label !== 'string'}>{label}</NaturalAvatar.Label>
            {description && (
              <NaturalAvatar.Description asChild={typeof description !== 'string'}>
                {description}
              </NaturalAvatar.Description>
            )}
          </div>
        </NaturalAvatar.Root>
      </>
    );
  },
);
