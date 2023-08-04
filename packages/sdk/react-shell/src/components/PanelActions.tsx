//
// Copyright 2023 DXOS.org
//

import React, { ComponentPropsWithoutRef, ReactNode } from 'react';

import { Button, Tooltip, ButtonProps, ThemedClassName } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

type PanelActionsProps = Omit<ThemedClassName<ComponentPropsWithoutRef<'div'>>, 'children'> & {
  children: ReactNode | ReactNode[];
};

const PanelActions = ({ classNames, children, ...props }: PanelActionsProps) => {
  return (
    <div
      {...props}
      className={mx(
        'flex gap-2 mbs-2',
        Array.isArray(children) && children.length > 1 ? 'justify-between' : 'justify-center',
        classNames,
      )}
    >
      {children}
    </div>
  );
};

type PanelActionProps = ButtonProps & { 'aria-label': string };

const PanelAction = (props: PanelActionProps) => {
  return (
    <Tooltip.Root delayDuration={1500}>
      <Tooltip.Content side='bottom' sideOffset={12}>
        {props['aria-label']}
        <Tooltip.Arrow />
      </Tooltip.Content>
      <Tooltip.Trigger asChild>
        <Button variant='ghost' {...props} classNames={['p-4', props.classNames]} />
      </Tooltip.Trigger>
    </Tooltip.Root>
  );
};

export { PanelActions, PanelAction };
export type { PanelActionsProps, PanelActionProps };
