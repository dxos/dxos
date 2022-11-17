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
import { Button, ButtonGroup, ButtonProps } from '../Button';
import { Tooltip, TooltipProps } from '../Tooltip';

interface SharedQrCodeProps
  extends Omit<ButtonProps, 'onClick' | 'ref' | 'variant'>,
    Pick<TooltipProps, 'side' | 'sideOffset' | 'collisionPadding'> {
  value: string;
  buttonCompact?: boolean;
}

export interface FullQrCodeProps extends SharedQrCodeProps {
  label: string | Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
  size?: Size;
}

export type QrCodeProps = FullQrCodeProps;

export interface CompactQrCodeProps extends SharedQrCodeProps {
  displayQrLabel: string | Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
  copyLabel: string | Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
}

export const FullQrCode = ({
  value,
  label,
  size,
  side,
  sideOffset,
  collisionPadding,
  buttonCompact = true,
  ...buttonProps
}: FullQrCodeProps) => {
  const labelId = useId('qr-label');
  const copyValue = useCallback(() => {
    void navigator.clipboard.writeText(value);
  }, [value]);
  return (
    <Tooltip content={label} {...{ side, sideOffset, collisionPadding }}>
      <Button
        compact={buttonCompact}
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

export const CompactQrCode = ({
  value,
  displayQrLabel,
  copyLabel,
  side,
  sideOffset,
  collisionPadding,
  compact,
  buttonCompact,
  ...buttonProps
}: CompactQrCodeProps) => {
  const labelId = useId('qr-label');
  const copyValue = useCallback(() => {
    void navigator.clipboard.writeText(value);
  }, [value]);
  return (
    <>
      <ButtonGroup className='inline-flex grow md:hidden'>
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
          {...{ side: side ?? 'left', sideOffset, collisionPadding }}
        >
          <Button
            rounding='rounded-is-md'
            compact={buttonCompact}
            {...buttonProps}
            className={cx('border-ie-0 grow', buttonProps.className)}
            aria-labelledby={labelId}
          >
            <QrCodeIcon className={getSize(5)} />
          </Button>
        </Tooltip>
        <Tooltip content={copyLabel} tooltipLabelsTrigger {...{ side, sideOffset, collisionPadding }}>
          <Button
            rounding='rounded-ie-md grow'
            compact={buttonCompact}
            {...buttonProps}
            className={buttonProps.className}
            onClick={copyValue}
          >
            <CopySimple className={getSize(5)} />
          </Button>
        </Tooltip>
      </ButtonGroup>
      <ButtonGroup className='hidden md:inline-flex'>
        <Tooltip
          compact
          content={
            <div role='none' className='overflow-hidden rounded-md'>
              <QRCodeSVG value={value} includeMargin role='none' className={getSize(32)} />
            </div>
          }
          {...{ side: side ?? 'left', sideOffset, collisionPadding }}
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
      </ButtonGroup>
    </>
  );
};

export const QrCode = FullQrCode;
