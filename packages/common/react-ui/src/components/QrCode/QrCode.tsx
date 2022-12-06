//
// Copyright 2022 DXOS.org
//

import { QrCode as QrCodeIcon, CopySimple } from 'phosphor-react';
import { QRCodeSVG } from 'qrcode.react';
import React, { useCallback, ReactHTMLElement, ComponentProps } from 'react';

import { useId } from '../../hooks';
import { Size } from '../../props';
import { getSize } from '../../styles';
import { mx } from '../../util';
import { Button, ButtonGroup } from '../Button';
import { Tooltip, TooltipSlots } from '../Tooltip';

interface SharedQrCodeProps {
  value: string;
  buttonCompact?: boolean;
}

interface FullQrCodeSlots {
  tooltipContent?: TooltipSlots['content'];
  tooltipArrow?: TooltipSlots['arrow'];
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
  qrTooltipContent?: TooltipSlots['content'];
  qrTooltipArrow?: TooltipSlots['arrow'];
  qrButton?: Omit<ComponentProps<'button'>, 'ref' | 'children'>;
  copyTooltipContent?: TooltipSlots['content'];
  copyTooltipArrow?: TooltipSlots['arrow'];
  copyButton?: Omit<ComponentProps<'button'>, 'ref' | 'children'>;
  qrSvg?: ComponentProps<typeof QRCodeSVG>;
}

export interface CompactQrCodeProps extends SharedQrCodeProps {
  displayQrLabel: string | Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
  copyLabel: string | Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
  slots?: CompactQrCodeSlots;
}

export const FullQrCode = ({ value, label, size, buttonCompact = true, slots = {} }: FullQrCodeProps) => {
  const labelId = useId('qr-label');
  const copyValue = useCallback(() => {
    void navigator.clipboard.writeText(value);
  }, [value]);
  return (
    <Tooltip content={label} {...slots.tooltipContent}>
      <Button
        compact={buttonCompact}
        {...slots.button}
        className={mx('overflow-hidden p-0', getSize(size ?? 32), slots.button?.className)}
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
    </Tooltip>
  );
};

export const CompactQrCode = ({ value, displayQrLabel, copyLabel, buttonCompact, slots = {} }: CompactQrCodeProps) => {
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
          slots={{ content: { ...slots.qrTooltipContent, side: slots?.qrTooltipContent?.side ?? 'left' } }}
          content={
            <div role='none' className='overflow-hidden rounded-md'>
              <QRCodeSVG
                includeMargin
                role='none'
                {...slots.qrSvg}
                value={value}
                className={mx(getSize(32), slots.qrSvg?.className)}
              />
            </div>
          }
        >
          <Button
            compact={buttonCompact}
            {...slots.qrButton}
            className={mx('border-ie-0 grow rounded-is-md', slots.qrButton?.className)}
            aria-labelledby={labelId}
          >
            <QrCodeIcon className={getSize(5)} />
          </Button>
        </Tooltip>
        <Tooltip content={copyLabel} tooltipLabelsTrigger slots={{ content: slots.qrTooltipContent }}>
          <Button
            compact={buttonCompact}
            {...slots.copyButton}
            className={mx('rounded-ie-md grow', slots.copyButton?.className)}
            onClick={copyValue}
          >
            <CopySimple className={getSize(5)} />
          </Button>
        </Tooltip>
      </ButtonGroup>
      <ButtonGroup className='hidden md:inline-flex'>
        <Tooltip
          compact
          slots={{ content: { ...slots.qrTooltipContent, side: slots?.qrTooltipContent?.side ?? 'left' } }}
          content={
            <div role='none' className='overflow-hidden rounded-md'>
              <QRCodeSVG
                includeMargin
                role='none'
                {...slots.qrSvg}
                value={value}
                className={mx(getSize(32), slots.qrSvg?.className)}
              />
            </div>
          }
        >
          <Button
            compact={buttonCompact}
            {...slots.qrButton}
            className={mx('border-ie-0 flex gap-1 rounded-is-md', slots.qrButton?.className)}
          >
            <QrCodeIcon className={getSize(5)} />
            {displayQrLabel}
          </Button>
        </Tooltip>
        <Button
          compact={buttonCompact}
          {...slots.copyButton}
          className={mx('flex gap-1 rounded-ie-md', slots.copyButton?.className)}
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
