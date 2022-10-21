//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import { QRCodeSVG } from 'qrcode.react';
import React, { useCallback } from 'react';

import { useId } from '../../hooks';
import { Button, ButtonProps } from '../Button';
import { Tooltip } from '../Tooltip';

export interface QrCodeProps extends Omit<ButtonProps, 'onClick' | 'ref'> {
  value: string
  label: string
}

export const QrCode = ({
  value,
  label,
  ...buttonProps
}: QrCodeProps) => {
  const labelId = useId('qr-label');
  const copyValue = useCallback(() => {
    void navigator.clipboard.writeText(value);
  }, [value]);
  return (
    <Tooltip content={label}>
      <Button
        {...buttonProps}
        className={cx('py-0 px-0 overflow-hidden', buttonProps.className)}
        onClick={copyValue}
      >
        <QRCodeSVG value={value} includeMargin role='none' />
        <span id={labelId} className='sr-only'>{label}</span>
      </Button>
    </Tooltip>
  );
};
