//
// Copyright 2022 DXOS.org
//

import { QrCode as QrCodeIcon, CopySimple } from '@phosphor-icons/react';
import type { PopoverContentProps } from '@radix-ui/react-popover';
import { QRCodeSVG } from 'qrcode.react';
import React, { useCallback, type ReactHTMLElement, type ComponentProps } from 'react';

import { Button, ButtonGroup, type ButtonProps, type Size, useId } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';

import { Popover } from '../Popover';
import { TooltipContent, TooltipRoot, TooltipTrigger, type TooltipContentProps } from '../Tooltip';

interface SharedQrCodeProps extends Pick<ButtonProps, 'density' | 'elevation'> {
  value: string;
}

interface FullQrCodeSlots {
  tooltipContent?: Omit<TooltipContentProps, 'ref' | 'children'>;
  button?: Omit<ComponentProps<'button'>, 'ref' | 'children'>;
  qrSvg?: ComponentProps<typeof QRCodeSVG>;
}

export interface FullQrCodeProps extends SharedQrCodeProps {
  label: string | Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
  size?: Size;
  slots?: FullQrCodeSlots;
}

export type QrCodeProps = FullQrCodeProps;

interface CompactQrCodeSlots {
  qrTooltipContent?: Omit<PopoverContentProps, 'children'>;
  qrButton?: Omit<ComponentProps<'button'>, 'ref' | 'children'>;
  copyTooltipContent?: Omit<PopoverContentProps, 'children'>;
  copyButton?: Omit<ComponentProps<'button'>, 'ref' | 'children'>;
  qrSvg?: ComponentProps<typeof QRCodeSVG>;
}

export interface CompactQrCodeProps extends SharedQrCodeProps {
  displayQrLabel: undefined | string | Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
  copyLabel: string | Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
  slots?: CompactQrCodeSlots;
}

export const FullQrCode = ({ value, label, size, density, elevation, slots = {} }: FullQrCodeProps) => {
  const labelId = useId('qr-label');
  const copyValue = useCallback(() => {
    void navigator.clipboard.writeText(value);
  }, [value]);
  return (
    <TooltipRoot>
      <TooltipContent {...slots.tooltipContent}>{label}</TooltipContent>
      <TooltipTrigger asChild>
        <Button
          {...{ density, elevation }}
          {...slots.button}
          classNames={['overflow-hidden p-0', getSize(size ?? 32), slots.button?.className]}
          onClick={copyValue}
        >
          <QRCodeSVG
            includeMargin
            role='none'
            {...slots.qrSvg}
            value={value}
            className={mx('w-full h-auto', slots.qrSvg?.className)}
          />
          <div id={labelId} className='sr-only'>
            {label}
          </div>
        </Button>
      </TooltipTrigger>
    </TooltipRoot>
  );
};

export const CompactQrCode = ({
  value,
  displayQrLabel,
  copyLabel,
  density,
  elevation,
  slots = {},
}: CompactQrCodeProps) => {
  const labelId = useId('qr-label');
  const copyValue = useCallback(() => {
    void navigator.clipboard.writeText(value);
  }, [value]);
  return (
    <>
      <ButtonGroup classNames='inline-flex grow md:hidden'>
        {displayQrLabel && (
          <span className='sr-only' id={labelId}>
            {displayQrLabel}
          </span>
        )}
        <Popover
          openTrigger={
            <Button
              {...{ density, elevation }}
              {...slots.qrButton}
              classNames={['border-ie-0 grow rounded-ie-none rounded-is-md', slots.qrButton?.className]}
              aria-labelledby={labelId}
            >
              <QrCodeIcon className={getSize(5)} />
            </Button>
          }
          slots={{
            content: { className: 'p-0', ...slots.qrTooltipContent, side: slots?.qrTooltipContent?.side ?? 'bottom' },
            trigger: { asChild: true },
          }}
        >
          <div role='none' className='overflow-hidden rounded-md'>
            <QRCodeSVG
              includeMargin
              role='none'
              {...slots.qrSvg}
              value={value}
              className={mx(getSize(64), slots.qrSvg?.className)}
            />
          </div>
        </Popover>
        <TooltipRoot>
          <TooltipContent {...slots.qrTooltipContent}>{copyLabel}</TooltipContent>
          <TooltipTrigger asChild>
            <Button
              {...{ density, elevation }}
              {...slots.copyButton}
              classNames={mx('rounded-is-none rounded-ie-md grow', slots.copyButton?.className)}
              onClick={copyValue}
            >
              <CopySimple className={getSize(5)} />
            </Button>
          </TooltipTrigger>
        </TooltipRoot>
      </ButtonGroup>
      <ButtonGroup classNames='hidden md:inline-flex'>
        <Popover
          openTrigger={
            <Button
              {...{ density, elevation }}
              {...slots.qrButton}
              classNames={['border-ie-0 flex gap-1 rounded-ie-none rounded-is-md', slots.qrButton?.className]}
            >
              <QrCodeIcon className={getSize(5)} />
              {displayQrLabel}
            </Button>
          }
          slots={{
            content: { className: 'p-0', ...slots.qrTooltipContent, side: slots?.qrTooltipContent?.side ?? 'left' },
            trigger: { asChild: true },
          }}
        >
          <div role='none' className='overflow-hidden rounded-md'>
            <QRCodeSVG
              includeMargin
              role='none'
              {...slots.qrSvg}
              value={value}
              className={mx(getSize(64), slots.qrSvg?.className)}
            />
          </div>
        </Popover>
        <Button
          {...{ density, elevation }}
          {...slots.copyButton}
          classNames={['flex gap-1 rounded-ie-md rounded-is-none', slots.copyButton?.className]}
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
