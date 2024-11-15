//
// Copyright 2024 DXOS.org
//

import React, {
  type ComponentPropsWithRef,
  Fragment,
  type PropsWithChildren,
  forwardRef,
  useRef,
  useState,
} from 'react';

import { type ActionLike } from '@dxos/app-graph';
import { keySymbols } from '@dxos/keyboard';
import {
  Button,
  ButtonGroup,
  type ButtonGroupProps,
  type ButtonProps,
  DropdownMenu,
  Icon,
  type ThemedClassName,
  toLocalizedString,
  Tooltip,
  useTranslation,
} from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { descriptionText, mx } from '@dxos/react-ui-theme';
import { getHostPlatform } from '@dxos/util';

import { StackItemResizeHandle } from './StackItemResizeHandle';
import { translationKey } from '../translations';

// TODO(thure): Dedupe (also in react-ui-navtree)
export type KeyBinding = {
  windows?: string;
  macos?: string;
  ios?: string;
  linux?: string;
  unknown?: string;
};

// TODO(thure): Dedupe (similar in react-ui-navtree)
type PlankHeadingAction = Pick<ActionLike, 'id' | 'properties' | 'data'>;

type AttendableId = { attendableId?: string };

type Related = { related?: boolean };

type PlankHeadingButtonProps = Omit<ButtonProps, 'variant'> & AttendableId & Related;

type PlankRootProps = ThemedClassName<ComponentPropsWithRef<'div'>>;

const PlankHeadingRoot = forwardRef<HTMLDivElement, PlankRootProps>(
  ({ children, classNames, ...props }, forwardedRef) => {
    return (
      <div role='none' className={mx('flex items-center bg-base', classNames)} {...props} ref={forwardedRef}>
        {children}
      </div>
    );
  },
);

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
  ({ attendableId, classNames, related, children, ...props }, forwardedRef) => {
    const { hasAttention, isAncestor, isRelated } = useAttention(attendableId);
    const variant = (related && isRelated) || hasAttention || isAncestor ? 'primary' : 'ghost';
    return (
      <Button
        {...props}
        variant={variant}
        classNames={['m-1 shrink-0 pli-0 min-bs-0 is-[--rail-action] bs-[--rail-action] relative', classNames]}
        ref={forwardedRef}
      >
        <MenuSignifierHorizontal />
        {children}
      </Button>
    );
  },
);

type PlankHeadingActionsMenuProps = PropsWithChildren<
  {
    attendableId?: string;
    triggerLabel: string;
    actions?: PlankHeadingAction[][];
    icon: string;
    onAction?: (action: PlankHeadingAction) => void;
  } & Related
>;

const PlankHeadingActionsMenu = forwardRef<HTMLButtonElement, PlankHeadingActionsMenuProps>(
  ({ actions: actionGroups, onAction, triggerLabel, attendableId, icon, related, children }, forwardedRef) => {
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
              <PlankHeadingButton attendableId={attendableId} related={related}>
                <span className='sr-only'>{triggerLabel}</span>
                <Icon icon={icon} size={5} />
              </PlankHeadingButton>
            </DropdownMenu.Trigger>
          </Tooltip.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content classNames='z-[31]'>
              <DropdownMenu.Viewport>
                {actionGroups?.map((actions, index) => {
                  const separator = index > 0 ? <DropdownMenu.Separator /> : null;
                  return (
                    <Fragment key={index}>
                      {separator}
                      {actions.map((action) => {
                        const shortcut =
                          typeof action.properties.keyBinding === 'string'
                            ? action.properties.keyBinding
                            : action.properties.keyBinding?.[getHostPlatform()];

                        const menuItemType = action.properties.menuItemType;
                        const Root = menuItemType === 'toggle' ? DropdownMenu.CheckboxItem : DropdownMenu.Item;

                        return (
                          <Root
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
                            checked={menuItemType === 'toggle' ? action.properties.isChecked : undefined}
                            {...(action.properties?.testId && { 'data-testid': action.properties.testId })}
                          >
                            <Icon icon={action.properties.icon ?? 'ph--placeholder--regular'} size={4} />
                            <span className='grow truncate'>{toLocalizedString(action.properties.label ?? '', t)}</span>
                            {menuItemType === 'toggle' && (
                              <DropdownMenu.ItemIndicator asChild>
                                <Icon icon='ph--check--regular' size={4} />
                              </DropdownMenu.ItemIndicator>
                            )}
                            {shortcut && (
                              <span className={mx('shrink-0', descriptionText)}>{keySymbols(shortcut).join('')}</span>
                            )}
                          </Root>
                        );
                      })}
                    </Fragment>
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

type PlankHeadingLabelProps = ThemedClassName<ComponentPropsWithRef<'h1'>> & AttendableId & Related;

const PlankHeadingLabel = forwardRef<HTMLHeadingElement, PlankHeadingLabelProps>(
  ({ attendableId, related, classNames, ...props }, forwardedRef) => {
    const { hasAttention, isAncestor, isRelated } = useAttention(attendableId);
    return (
      <h1
        {...props}
        data-attention={((related && isRelated) || hasAttention || isAncestor).toString()}
        className={mx(
          'pli-1 min-is-0 is-0 grow truncate font-medium text-baseText data-[attention=true]:text-accentText',
          classNames,
        )}
        ref={forwardedRef}
      />
    );
  },
);

type PlankControlEvent = 'solo' | 'close' | `${'pin' | 'increment'}-${'start' | 'end'}`;
type PlankControlHandler = (event: PlankControlEvent) => void;

type PlankHeadingCapabilites = {
  incrementStart?: boolean;
  incrementEnd?: boolean;
  solo?: boolean;
  resize?: boolean;
};

type PlankHeadingControlsProps = Omit<ButtonGroupProps, 'onClick'> & {
  onClick?: PlankControlHandler;
  variant?: 'hide-disabled' | 'default';
  close?: boolean | 'minify-start' | 'minify-end';
  capabilities: PlankHeadingCapabilites;
  isSolo?: boolean;
  pin?: 'start' | 'end' | 'both';
};

const PlankHeadingControl = ({
  icon,
  label,
  ...props
}: Omit<ButtonProps, 'children'> & { label: string; icon: string }) => {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <Button variant='ghost' {...props}>
          <span className='sr-only'>{label}</span>
          <Icon icon={icon} />
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
  (
    { onClick, variant = 'default', capabilities: can, isSolo, pin, close = false, children, ...props },
    forwardedRef,
  ) => {
    const { t } = useTranslation(translationKey);
    const buttonClassNames = variant === 'hide-disabled' ? 'disabled:hidden !p-1' : '!p-1';

    return (
      <ButtonGroup {...props} ref={forwardedRef}>
        {pin && !isSolo && ['both', 'start'].includes(pin) && (
          <PlankHeadingControl
            label={t('pin start label')}
            variant='ghost'
            classNames={buttonClassNames}
            onClick={() => onClick?.('pin-start')}
            icon='ph--caret-line-left--regular'
          />
        )}

        {can.solo && (
          <PlankHeadingControl
            label={t('solo plank label')}
            classNames={buttonClassNames}
            onClick={() => onClick?.('solo')}
            icon={isSolo ? 'ph--arrows-in--regular' : 'ph--arrows-out--regular'}
          />
        )}

        {!isSolo && can.solo && (
          <>
            <PlankHeadingControl
              label={t('increment start label')}
              disabled={!can.incrementStart}
              classNames={buttonClassNames}
              onClick={() => onClick?.('increment-start')}
              icon='ph--caret-left--regular'
            />
            <PlankHeadingControl
              label={t('increment end label')}
              disabled={!can.incrementEnd}
              classNames={buttonClassNames}
              onClick={() => onClick?.('increment-end')}
              icon='ph--caret-right--regular'
            />
          </>
        )}

        {pin && !isSolo && ['both', 'end'].includes(pin) && (
          <PlankHeadingControl
            label={t('pin end label')}
            classNames={buttonClassNames}
            onClick={() => onClick?.('pin-end')}
            icon='ph--caret-line-right--regular'
          />
        )}

        {close && !isSolo && (
          <PlankHeadingControl
            label={t(`${typeof close === 'string' ? 'minify' : 'close'} label`)}
            classNames={buttonClassNames}
            onClick={() => onClick?.('close')}
            data-testid='plankHeading.close'
            icon={
              close === 'minify-start'
                ? 'ph--caret-line-left--regular'
                : close === 'minify-end'
                  ? 'ph--caret-line-right--regular'
                  : 'ph--minus--regular'
            }
          />
        )}
        {children}
        {can.resize && <StackItemResizeHandle classNames={buttonClassNames} />}
      </ButtonGroup>
    );
  },
);

export const PlankHeading = {
  Root: PlankHeadingRoot,
  Button: PlankHeadingButton,
  Label: PlankHeadingLabel,
  ActionsMenu: PlankHeadingActionsMenu,
  Controls: PlankHeadingControls,
};

export type {
  PlankHeadingAction,
  PlankHeadingButtonProps,
  PlankHeadingActionsMenuProps,
  PlankHeadingControlsProps,
  PlankControlEvent as PlankControlEventType,
  PlankControlHandler,
};
