//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import { QrCode as QrCodeIcon, CopySimple } from 'phosphor-react';
import { QRCodeSVG } from 'qrcode.react';
import React, { useCallback, ReactHTMLElement } from 'react';

import { useId } from '../../hooks';
import { Size } from '../../props';
import { getSize } from '../../styles';
import { Button, ButtonProps } from '../Button';
import { Tooltip, TooltipProps } from '../Tooltip';

export interface QrCodeProps
  extends Omit<ButtonProps, 'onClick' | 'ref' | 'variant'>,
    Pick<TooltipProps, 'side' | 'sideOffset' | 'collisionPadding'> {
  compact?: boolean;
  value: string;
  displayQrLabel: string | Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
  copyLabel: string | Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
  buttonCompact?: boolean;
  size?: Size;
}

const FullQrCode = ({
  value,
  displayQrLabel,
  copyLabel,
  size,
  side,
  sideOffset,
  collisionPadding,
  buttonCompact = true,
  ...buttonProps
}: QrCodeProps) => {
  const labelId = useId('qr-label');
  const copyValue = useCallback(() => {
    void navigator.clipboard.writeText(value);
  }, [value]);
  return (
    <Tooltip
      content={
        <>
          {displayQrLabel}
          {copyLabel}
        </>
      }
      {...{ side, sideOffset, collisionPadding }}
    >
      <Button
        compact={buttonCompact}
        {...buttonProps}
        className={cx('overflow-hidden p-0', getSize(size ?? 32), buttonProps.className)}
        onClick={copyValue}
      >
        <QRCodeSVG value={value} includeMargin role='none' className='w-full h-auto' />
        <div id={labelId} className='sr-only'>
          {displayQrLabel}
        </div>
      </Button>
    </Tooltip>
  );
};

const CompactQrCode = ({
  value,
  displayQrLabel,
  copyLabel,
  size,
  side,
  sideOffset,
  collisionPadding,
  compact,
  buttonCompact,
  ...buttonProps
}: QrCodeProps) => {
  const labelId = useId('qrCodeLabel');
  const copyValue = useCallback(() => {
    void navigator.clipboard.writeText(value);
  }, [value]);
  return (
    <>
      <div className='flex md:hidden'>
        <span className='sr-only' id={labelId}>
          {displayQrLabel}
        </span>
        <Tooltip
          compact
          content={
            <div role='none' className='overflow-hidden rounded-md'>
              <QRCodeSVG value={value} includeMargin role='none' className={getSize(32)} />
            </div>
          }
          {...{ side, sideOffset, collisionPadding }}
        >
          <Button
            rounding='rounded-is-md'
            compact={buttonCompact}
            {...buttonProps}
            className={cx('border-ie-0', buttonProps.className)}
            aria-labelledby={labelId}
          >
            <QrCodeIcon className={getSize(5)} />
          </Button>
        </Tooltip>
        <Tooltip content={copyLabel} tooltipLabelsTrigger {...{ side, sideOffset, collisionPadding }}>
          <Button
            rounding='rounded-ie-md'
            compact={buttonCompact}
            {...buttonProps}
            className={buttonProps.className}
            onClick={copyValue}
          >
            <CopySimple className={getSize(5)} />
          </Button>
        </Tooltip>
      </div>
      <div className='hidden md:flex'>
        <Tooltip
          compact
          content={
            <div role='none' className='overflow-hidden rounded-md'>
              <QRCodeSVG value={value} includeMargin role='none' className={getSize(32)} />
            </div>
          }
          {...{ side, sideOffset, collisionPadding }}
        >
          <Button
            rounding='rounded-is-md'
            compact={buttonCompact}
            {...buttonProps}
            className={cx('border-ie-0 flex gap-1', buttonProps.className)}
          >
            <QrCodeIcon className={getSize(5)} />
            {displayQrLabel}
          </Button>
        </Tooltip>
        <Button
          rounding='rounded-ie-md'
          compact={buttonCompact}
          {...buttonProps}
          className={cx('flex gap-1', buttonProps.className)}
          onClick={copyValue}
        >
          <CopySimple className={getSize(5)} />
          {copyLabel}
        </Button>
      </div>
    </>
  );
};

export const QrCode = (props: QrCodeProps) => {
  return props.compact ? <CompactQrCode {...props} /> : <FullQrCode {...props} />;
};
