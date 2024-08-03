//
// Copyright 2024 DXOS.org
//

import { type Icon, ChatText, TextAlignCenter, TextAlignLeft, TextAlignRight } from '@phosphor-icons/react';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren } from 'react';

import {
  DensityProvider,
  ElevationProvider,
  type ThemedClassName,
  Toolbar as NaturalToolbar,
  type ToolbarButtonProps as NaturalToolbarButtonProps,
  type ToolbarToggleGroupItemProps as NaturalToolbarToggleGroupItemProps,
  Tooltip,
  useTranslation,
} from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

import { SHEET_PLUGIN } from '../../meta';
import { type Format } from '../../types';

// TODO(burdon): Factor out in common with react-ui-editor.

const iconStyles = getSize(5);
const buttonStyles = 'min-bs-0 p-2';
const tooltipProps = { side: 'top' as const, classNames: 'z-10' };

const ToolbarSeparator = () => <div role='separator' className='grow' />;

//
// Root
//

export type ToolbarProps = ThemedClassName<
  PropsWithChildren<{
    onAction?: () => void;
  }>
>;

const [ToolbarContextProvider, useToolbarContext] = createContext<ToolbarProps>('Toolbar');

const ToolbarRoot = ({ children, onAction, classNames }: ToolbarProps) => {
  return (
    <ToolbarContextProvider onAction={onAction}>
      <DensityProvider density='fine'>
        <ElevationProvider elevation='chrome'>
          <NaturalToolbar.Root classNames={['is-full shrink-0 overflow-x-auto overflow-y-hidden p-1', classNames]}>
            {children}
          </NaturalToolbar.Root>
        </ElevationProvider>
      </DensityProvider>
    </ToolbarContextProvider>
  );
};

//
// TODO(burdon): Common.
//

type ToolbarButtonProps = NaturalToolbarButtonProps & { Icon: Icon };

const ToolbarButton = ({ Icon, children, ...props }: ToolbarButtonProps) => {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <NaturalToolbar.Button variant='ghost' {...props} classNames={buttonStyles}>
          <Icon className={iconStyles} />
          <span className='sr-only'>{children}</span>
        </NaturalToolbar.Button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content {...tooltipProps}>
          {children}
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};

type ToolbarToggleButtonProps = NaturalToolbarToggleGroupItemProps & { Icon: Icon };

// TODO(burdon): In common with react-ui-editor.
const ToolbarToggleButton = ({ Icon, children, ...props }: ToolbarToggleButtonProps) => {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <NaturalToolbar.ToggleGroupItem variant='ghost' {...props} classNames={buttonStyles}>
          <Icon className={iconStyles} />
          <span className='sr-only'>{children}</span>
        </NaturalToolbar.ToggleGroupItem>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content {...tooltipProps}>
          {children}
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};

type ButtonProps = {
  type: string;
  Icon: Icon;
  getState: (state: Format) => boolean;
  disabled?: (state: Format) => boolean;
};

//
// Alignment
//

const alignmentStyles: ButtonProps[] = [
  { type: 'left', Icon: TextAlignLeft, getState: (state) => false },
  { type: 'center', Icon: TextAlignCenter, getState: (state) => false },
  { type: 'right', Icon: TextAlignRight, getState: (state) => false },
];

const Alignment = () => {
  // const { onAction } = useToolbarContext('CellStyles');
  const { t } = useTranslation(SHEET_PLUGIN);

  return (
    <NaturalToolbar.ToggleGroup
      type='multiple'
      // value={cellStyles.filter(({ getState }) => state && getState(state)).map(({ type }) => type)}
    >
      {alignmentStyles.map(({ type, getState, Icon }) => (
        <ToolbarToggleButton
          key={type}
          value={type}
          Icon={Icon}
          // disabled={state?.blockType === 'codeblock'}
          // onClick={state ? () => onAction?.({ type, data: !getState(state) }) : undefined}
        >
          {t(`toolbar ${type} label`)}
        </ToolbarToggleButton>
      ))}
    </NaturalToolbar.ToggleGroup>
  );
};

//
// TODO(burdon): Styles picker (colors, etc.)
// TODO(burdon): Clear formatting.
//

//
// TODO(burdon): Format menu (number, etc.)
//

// TODO(burdon): Show range with same formatting.

//
// Actions
//

const Actions = () => {
  // const { onAction } = useToolbarContext('Actions');
  const { t } = useTranslation(SHEET_PLUGIN);
  return (
    <>
      <ToolbarButton
        value='comment'
        Icon={ChatText}
        data-testid='editor.toolbar.comment'
        // onClick={() => onAction?.({ type: 'comment' })}
        // disabled={!state || state.comment || !state.selection}
      >
        {t('comment label')}
      </ToolbarButton>
    </>
  );
};

export const Toolbar = {
  Root: ToolbarRoot,
  Separator: ToolbarSeparator,
  Alignment,
  Actions,
};

export { useToolbarContext };
