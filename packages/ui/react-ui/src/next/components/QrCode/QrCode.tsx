//
// Copyright 2026 DXOS.org
//

import { QrCode as QrCodePrimitive } from '@ark-ui/react/qr-code';
import React, { forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { Icon } from '../Icon/index.ts';

export type QrCodeErrorCorrection = 'L' | 'M' | 'Q' | 'H';

export type QrCodeProps = ThemedClassName<
  Omit<QrCodePrimitive.RootProps, 'value' | 'defaultValue' | 'encoding' | 'children'>
> & {
  /** What the code encodes. */
  value: string;
  /** How much of the code may be lost and still read; higher costs modules. `M` by default. */
  errorCorrection?: QrCodeErrorCorrection;
  /** An icon over the centre, which the error correction must cover (use `Q` or `H`). */
  icon?: string;
  /** Names the code (`aria-label`); otherwise reference a visible name with `aria-labelledby`. */
  label?: string;
};

/**
 * Ark's QR code: a square that fills its host's width, its modules drawn in the current text colour on a transparent
 * ground so it reads on any surface. The root is the element (`role=img`), so a label lands on it.
 */
export const QrCode = forwardRef<HTMLDivElement, QrCodeProps>(
  ({ classNames, value, errorCorrection = 'M', icon, label, ...props }, forwardedRef) => (
    <QrCodePrimitive.Root
      role='img'
      {...(label && { 'aria-label': label })}
      {...props}
      value={value}
      encoding={{ ecc: errorCorrection }}
      className={mx(recipes.qrCode(), classNames)}
      ref={forwardedRef}
    >
      <QrCodePrimitive.Frame className={recipes.qrCodeFrame()}>
        <QrCodePrimitive.Pattern className={recipes.qrCodePattern()} />
      </QrCodePrimitive.Frame>
      {icon && (
        <QrCodePrimitive.Overlay className={recipes.qrCodeOverlay()}>
          <Icon icon={icon} />
        </QrCodePrimitive.Overlay>
      )}
    </QrCodePrimitive.Root>
  ),
);

QrCode.displayName = 'QrCode';
