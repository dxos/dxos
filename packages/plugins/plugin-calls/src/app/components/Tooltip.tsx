//
// Copyright 2024 DXOS.org
//

import * as RadixTooltip from '@radix-ui/react-tooltip';
import React, { type FC, type ReactNode } from 'react';

interface TooltipProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  content?: ReactNode;
  children: ReactNode;
}

export const Tooltip: FC<TooltipProps> = ({ children, content, open, onOpenChange }) => {
  if (content === undefined) {
    return <>{children}</>;
  }

  return (
    <RadixTooltip.Provider>
      <RadixTooltip.Root open={open} onOpenChange={onOpenChange}>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content className='bg-zinc-100 dark:bg-zinc-600 text-sm px-2 py-1 drop-shadow-md dark:drop-shadow-none rounded'>
            {content}
            <RadixTooltip.Arrow className='fill-zinc-100 dark:fill-zinc-600 drop-shadow dark:drop-shadow-none rounded' />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
};
