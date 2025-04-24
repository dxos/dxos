//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type AccordionItemProps = ThemedClassName<PropsWithChildren>;

export const AccordionItem = ({ children, classNames, ...props }: AccordionItemProps) => {
  return (
    <div className={mx('flex flex-col', classNames)} {...props}>
      {children}
    </div>
  );
};

export type AccordionItemHeaderProps = ThemedClassName<{ title: string; icon?: string }>;

export const AccordionItemHeader = ({ classNames, title, icon }: AccordionItemHeaderProps) => {
  const { openItems, setItemOpen } = useAccordionContext();

  const handleToggle = () => {};

  return (
    <div className={mx('flex w-full items-center p-2 gap-2', classNames)} onClick={handleToggle}>
      {icon && <Icon icon={icon} />}
      <div className='grow truncate'>{title}</div>
      <Icon
        icon='ph--caret-right--regular'
        size={4}
        className={mx('cursor-pointer', openItems.get(id) ? 'rotate-90' : '')}
        onClick={handleToggle}
      />
    </div>
  );
};

export type AccordionItemBodyProps = ThemedClassName<PropsWithChildren>;

export const AccordionItemBody = ({ children, classNames, ...props }: AccordionItemBodyProps) => {
  return (
    <div className={mx('flex flex-col p-2', classNames)} {...props}>
      {children}
    </div>
  );
};
