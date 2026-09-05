//
// Copyright 2026 DXOS.org
//

import { QrCode as QrCodePrimitive } from '@ark-ui/react/qr-code';
import React, { type ComponentPropsWithRef, forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

type QrCodeErrorCorrection = 'L' | 'M' | 'Q' | 'H';

type QrCodeProps = ThemedClassName<Omit<ComponentPropsWithRef<typeof QrCodePrimitive.Root>, 'value' | 'encoding'>> & {
  /** What the code encodes. */
  value: string;
  /** How much of the code may be lost and still read; higher costs modules. Defaults to `M`. */
  errorCorrection?: QrCodeErrorCorrection;
};

/**
 * A QR code drawn in the current text colour on a transparent ground, filling its box; built on
 * Ark's qr-code machine, which encodes and lays out the modules.
 */
const QrCode = forwardRef<HTMLDivElement, QrCodeProps>(
  ({ classNames, value, errorCorrection = 'M', ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <QrCodePrimitive.Root
        {...props}
        value={value}
        encoding={{ ecc: errorCorrection }}
        className={tx('qrCode.root', {}, classNames)}
        ref={forwardedRef}
      >
        <QrCodePrimitive.Frame className={tx('qrCode.frame', {})}>
          <QrCodePrimitive.Pattern className={tx('qrCode.pattern', {})} />
        </QrCodePrimitive.Frame>
      </QrCodePrimitive.Root>
    );
  },
);

QrCode.displayName = 'QrCode';

export { QrCode };

export type { QrCodeErrorCorrection, QrCodeProps };
