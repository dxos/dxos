//
// Copyright 2024 DXOS.org
//

import { CaretLeft, CaretLineLeft, CaretLineRight, CaretRight, type IconProps, Minus } from '@phosphor-icons/react';
import React, {
  type ComponentPropsWithRef,
  type FC,
  forwardRef,
  type PropsWithChildren,
  useRef,
  useState,
} from 'react';

import { keySymbols } from '@dxos/keyboard';
import {
  Button,
  ButtonGroup,
  type ButtonGroupProps,
  type ButtonProps,
  DropdownMenu,
  type ThemedClassName,
  toLocalizedString,
  Tooltip,
  useTranslation,
} from '@dxos/react-ui';
import { descriptionText, getSize, mx } from '@dxos/react-ui-theme';
import { getHostPlatform } from '@dxos/util';

import { plankHeadingLayout } from '../../fragments';
import { translationKey } from '../../translations';
import { type PlankHeadingAction } from '../../types';
import { useHasAttention } from '../Attention';

type AttendableId = { attendableId?: string };

type PlankHeadingButtonProps = Omit<ButtonProps, 'variant'> & AttendableId;

const plankHeadingIconProps: IconProps = {
  className: getSize(5),
  weight: 'duotone',
};

type PlankRootProps = ThemedClassName<ComponentPropsWithRef<'div'>>;

const PlankRoot = forwardRef<HTMLDivElement, PlankRootProps>(({ children, classNames, ...props }, forwardedRef) => {
  return (
    <div role='none' className={mx(plankHeadingLayout, classNames)} {...props} ref={forwardedRef}>
      {children}
    </div>
  );
});

const MenuSignifierHorizontal = () => (
  <svg
    className='absolute block-end-[7px]'
    width={20}
    height={2}
    viewBox='0 0 20 2'
    stroke='currentColor'
    opacity={0.5}
  >
    <line
      x1={0.5}
      y1={0.75}
      x2={19}
      y2={0.75}
      strokeWidth={1.25}
      strokeLinecap='round'
      strokeDasharray='6 20'
      strokeDashoffset='-6.5'
    />
  </svg>
);

const _MenuSignifierVertical = () => (
  <svg className='absolute inline-start-1' width={2} height={18} viewBox='0 0 2 18' stroke='currentColor'>
    <line x1={1} y1={3} x2={1} y2={18} strokeWidth={1.5} strokeLinecap='round' strokeDasharray='0 6' />
  </svg>
);

const PlankHeadingButton = forwardRef<HTMLButtonElement, PlankHeadingButtonProps>(
  ({ attendableId, classNames, children, ...props }, forwardedRef) => {
    const hasAttention = useHasAttention(attendableId);
    return (
      <Button
        {...props}
        variant={hasAttention ? 'primary' : 'ghost'}
        classNames={['m-1 shrink-0 pli-0 min-bs-0 is-[--rail-action] bs-[--rail-action] relative', classNames]}
        ref={forwardedRef}
      >
        <MenuSignifierHorizontal />
        {children}
      </Button>
    );
  },
);

type PlankHeadingActionsMenuProps = PropsWithChildren<{
  attendableId?: string;
  triggerLabel: string;
  actions?: PlankHeadingAction[];
  Icon: FC<IconProps>;
  onAction?: (action: PlankHeadingAction) => void;
}>;

const PlankHeadingActionsMenu = forwardRef<HTMLButtonElement, PlankHeadingActionsMenuProps>(
  ({ actions, onAction, triggerLabel, attendableId, Icon, children }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const suppressNextTooltip = useRef(false);

    const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
    const [triggerTooltipOpen, setTriggerTooltipOpen] = useState(false);

    return (
      <Tooltip.Root
        open={triggerTooltipOpen}
        onOpenChange={(nextOpen) => {
          if (suppressNextTooltip.current) {
            setTriggerTooltipOpen(false);
            suppressNextTooltip.current = false;
          } else {
            setTriggerTooltipOpen(nextOpen);
          }
        }}
      >
        <DropdownMenu.Root
          {...{
            open: optionsMenuOpen,
            onOpenChange: (nextOpen: boolean) => {
              if (!nextOpen) {
                suppressNextTooltip.current = true;
              }
              return setOptionsMenuOpen(nextOpen);
            },
          }}
        >
          <Tooltip.Trigger asChild>
            <DropdownMenu.Trigger asChild ref={forwardedRef}>
              <PlankHeadingButton attendableId={attendableId}>
                <span className='sr-only'>{triggerLabel}</span>
                <Icon {...plankHeadingIconProps} />
              </PlankHeadingButton>
            </DropdownMenu.Trigger>
          </Tooltip.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content classNames='z-[31]'>
              <DropdownMenu.Viewport>
                {actions?.map((action) => {
                  const shortcut =
                    typeof action.properties.keyBinding === 'string'
                      ? action.properties.keyBinding
                      : action.properties.keyBinding?.[getHostPlatform()];
                  return (
                    <DropdownMenu.Item
                      key={action.id}
                      onClick={(event) => {
                        if (action.properties.disabled) {
                          return;
                        }
                        event.stopPropagation();
                        // TODO(thure): Why does Dialog’s modal-ness cause issues if we don’t explicitly close the menu here?
                        suppressNextTooltip.current = true;
                        setOptionsMenuOpen(false);
                        onAction?.(action);
                      }}
                      classNames='gap-2'
                      disabled={action.properties.disabled}
                      {...(action.properties?.testId && { 'data-testid': action.properties.testId })}
                    >
                      {action.properties.icon && <action.properties.icon className={mx(getSize(4), 'shrink-0')} />}
                      <span className='grow truncate'>{toLocalizedString(action.properties.label ?? '', t)}</span>
                      {shortcut && (
                        <span className={mx('shrink-0', descriptionText)}>{keySymbols(shortcut).join('')}</span>
                      )}
                    </DropdownMenu.Item>
                  );
                })}
                {children}
              </DropdownMenu.Viewport>
              <DropdownMenu.Arrow />
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        <Tooltip.Portal>
          <Tooltip.Content style={{ zIndex: 70 }} side='bottom'>
            {triggerLabel}
            <Tooltip.Arrow />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    );
  },
);

type PlankHeadingLabelProps = ThemedClassName<ComponentPropsWithRef<'h1'>> & AttendableId;

const PlankHeadingLabel = forwardRef<HTMLHeadingElement, PlankHeadingLabelProps>(
  ({ attendableId, classNames, ...props }, forwardedRef) => {
    const hasAttention = useHasAttention(attendableId);
    return (
      <h1
        {...props}
        data-attention={hasAttention.toString()}
        className={mx(
          'pli-1 min-is-0 is-0 grow truncate font-medium fg-base data-[attention=true]:fg-accent',
          classNames,
        )}
        ref={forwardedRef}
      />
    );
  },
);

type PartIdentifier = [string, number, number];

type PlankControlEventType = 'close' | `${'pin' | 'increment'}-${'start' | 'end'}`;

type PlankControlHandler = (event: { type: PlankControlEventType; part: PartIdentifier }) => void;

type PlankHeadingControlsProps = Omit<ButtonGroupProps, 'onClick'> & {
  part: [string, number, number];
  onClick?: PlankControlHandler;
  variant?: 'hide-disabled' | 'default';
  close?: boolean | 'minify-start' | 'minify-end';
  increment?: boolean;
  pin?: 'start' | 'end' | 'both';
};

const PlankHeadingControl = ({ children, label, ...props }: ButtonProps & { label: string }) => {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Button variant='ghost' {...props}>
          <span className='sr-only'>{label}</span>
          {children}
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content side='bottom' classNames='z-[70]'>
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};

const PlankHeadingControls = forwardRef<HTMLDivElement, PlankHeadingControlsProps>(
  ({ part, onClick, variant = 'default', increment = true, pin, close = false, children, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const buttonClassNames = variant === 'hide-disabled' ? 'disabled:hidden p-1' : 'p-1';
    return (
      <ButtonGroup {...props} ref={forwardedRef}>
        {children}
        {pin && ['both', 'start'].includes(pin) && (
          <PlankHeadingControl
            label={t('pin start label')}
            variant='ghost'
            classNames={buttonClassNames}
            onClick={() => onClick?.({ type: 'pin-start', part })}
          >
            <CaretLineLeft />
          </PlankHeadingControl>
        )}
        {increment && (
          <>
            <PlankHeadingControl
              label={t('increment start label')}
              disabled={part[1] < 1}
              classNames={buttonClassNames}
              onClick={() => onClick?.({ type: 'increment-start', part })}
            >
              <CaretLeft />
            </PlankHeadingControl>
            <PlankHeadingControl
              label={t('increment end label')}
              disabled={part[1] > part[2] - 2}
              classNames={buttonClassNames}
              onClick={() => onClick?.({ type: 'increment-end', part })}
            >
              <CaretRight />
            </PlankHeadingControl>
          </>
        )}
        {pin && ['both', 'end'].includes(pin) && (
          <PlankHeadingControl
            label={t('pin end label')}
            classNames={buttonClassNames}
            onClick={() => onClick?.({ type: 'pin-end', part })}
          >
            <CaretLineRight />
          </PlankHeadingControl>
        )}
        {close && (
          <PlankHeadingControl
            label={t(`${typeof close === 'string' ? 'minify' : 'close'} label`)}
            classNames={buttonClassNames}
            onClick={() => onClick?.({ type: 'close', part })}
            data-testid='plankHeading.close'
          >
            {close === 'minify-start' ? <CaretLineLeft /> : close === 'minify-end' ? <CaretLineRight /> : <Minus />}
          </PlankHeadingControl>
        )}
      </ButtonGroup>
    );
  },
);

export const PlankHeading = {
  Root: PlankRoot,
  Button: PlankHeadingButton,
  Label: PlankHeadingLabel,
  ActionsMenu: PlankHeadingActionsMenu,
  Controls: PlankHeadingControls,
};
export { plankHeadingIconProps };

export type {
  PlankHeadingAction,
  PlankHeadingButtonProps,
  PlankHeadingActionsMenuProps,
  PlankHeadingControlsProps,
  PartIdentifier,
  PlankControlEventType,
  PlankControlHandler,
};
