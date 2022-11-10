//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import { QRCodeSVG } from 'qrcode.react';
import React, { useCallback, ReactHTMLElement } from 'react';

import { useId } from '../../hooks';
import { Size } from '../../props';
import { getSize } from '../../styles';
import { Button, ButtonProps } from '../Button';
import { Tooltip, TooltipProps } from '../Tooltip';

export interface QrCodeProps
  extends Omit<ButtonProps, 'onClick' | 'ref'>,
    Pick<TooltipProps, 'side' | 'sideOffset' | 'collisionPadding'> {
  value: string;
  label: string | Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
  size?: Size;
}

export const QrCode = ({ value, label, size, side, sideOffset, collisionPadding, ...buttonProps }: QrCodeProps) => {
  const labelId = useId('qr-label');
  const copyValue = useCallback(() => {
    void navigator.clipboard.writeText(value);
  }, [value]);
  return (
    <Tooltip content={label} {...{ side, sideOffset, collisionPadding }}>
      <Button
        compact
        {...buttonProps}
        className={cx('overflow-hidden p-0', getSize(size ?? 32), buttonProps.className)}
        onClick={copyValue}
      >
        <QRCodeSVG value={value} includeMargin role='none' className='w-full h-auto' />
        <div id={labelId} className='sr-only'>
          {label}
        </div>
      </Button>
    </Tooltip>
  );
};
