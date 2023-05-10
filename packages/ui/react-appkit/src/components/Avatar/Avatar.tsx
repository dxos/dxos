//
// Copyright 2022 DXOS.org
//

import * as AvatarPrimitive from '@radix-ui/react-avatar';
import React, {
  cloneElement,
  ComponentProps,
  ForwardedRef,
  forwardRef,
  PropsWithChildren,
  ReactHTMLElement,
  ReactNode
} from 'react';

import {
  Size,
  AvatarRoot,
  Avatar as NaturalAvatar,
  AvatarFallback,
  AvatarMaskedImage,
  AvatarStatus,
  AvatarImage,
  useJdenticonHref,
  useId,
  AvatarLabel
} from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

export interface AvatarSlots {
  root?: Omit<ComponentProps<typeof AvatarPrimitive.Root>, 'children'>;
  image?: ComponentProps<'image'>;
  fallback?: Omit<ComponentProps<typeof AvatarPrimitive.Fallback>, 'children'>;
  labels?: Omit<ComponentProps<'div'>, 'children' | 'ref'>;
}

interface SharedAvatarProps {
  fallbackValue: string;
  label?: string | Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
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
  label: string | Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
}

interface IdLabeledAvatarProps extends Omit<SharedAvatarProps, 'labelId'> {
  labelId: string;
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
      slots = {}
    }: PropsWithChildren<AvatarProps>,
    ref: ForwardedRef<HTMLSpanElement>
  ) => {
    const jdenticon = useJdenticonHref(fallbackValue, size);
    const descriptionId = useId('avatarDescription', propsDescriptionId);

    return (
      <>
        <AvatarRoot labelId={propsLabelId} {...{ size, variant }}>
          <NaturalAvatar {...slots.root} ref={ref}>
            {status ? (
              <AvatarStatus {...{ status }}>
                {mediaSrc && (
                  <AvatarImage asChild>
                    <AvatarMaskedImage href={mediaSrc} />
                  </AvatarImage>
                )}
                <AvatarFallback delayMs={0} asChild>
                  <AvatarMaskedImage href={jdenticon} />
                </AvatarFallback>
              </AvatarStatus>
            ) : (
              <>
                <AvatarImage src={mediaSrc} />
                <AvatarFallback asChild delayMs={0}>
                  <img src={jdenticon} />
                </AvatarFallback>
              </>
            )}
          </NaturalAvatar>
          <div role='none' {...slots.labels} className={mx('contents', slots?.labels?.className)}>
            <AvatarLabel asChild={typeof label !== 'string'}>{label}</AvatarLabel>
            {!propsDescriptionId &&
              description &&
              (typeof description === 'string' ? (
                <span id={descriptionId}>{description}</span>
              ) : (
                cloneElement(description, { id: descriptionId })
              ))}
          </div>
        </AvatarRoot>
      </>
    );
  }
);
