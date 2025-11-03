//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type JSX, type PropsWithChildren, useEffect, useState } from 'react';

import { Icon, type ThemedClassName, useControlledState } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

const IconBlock = ({ children }: PropsWithChildren) => (
  <div className='grid bs-[24px] is-[24px] place-items-center'>{children}</div>
);

//
// Context
//

type ContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Should shrink the width when closed. */
  shrink: boolean;
  duration: number;
  expandX: boolean;
  expandY: boolean;
};

const [ToggleContainerContext, useToggleContainerContext] = createContext<ContextValue>('ToggleContainer');

//
// Root
//

type RootProps = ThemedClassName<
  PropsWithChildren<
    {
      open?: boolean;
      defaultOpen?: boolean;
      onChangeOpen?: (open: boolean) => void;
    } & Partial<Pick<ContextValue, 'shrink' | 'duration'>>
  >
>;

const Root = ({
  classNames,
  open: openParam,
  defaultOpen = false,
  shrink = false,
  duration = 250,
  children,
  onChangeOpen,
}: RootProps) => {
  const [open, setOpen] = useControlledState<boolean>(openParam ?? defaultOpen);
  const [expandX, setExpandX] = useState<boolean>(shrink ? open : true);
  const [expandY, setExpandY] = useState<boolean>(open);

  // Orchestrate opening/closing animation.
  useEffect(() => {
    onChangeOpen?.(open);

    let t: NodeJS.Timeout;
    if (open) {
      if (shrink) {
        setExpandX(true);
      }
      t = setTimeout(
        () => {
          setExpandY(true);
        },
        shrink ? duration : 0,
      );
    } else {
      setExpandY(false);
      if (shrink) {
        t = setTimeout(() => {
          setExpandX(false);
        }, duration);
      }
    }

    return () => clearTimeout(t);
  }, [open]);

  return (
    <ToggleContainerContext
      shrink={shrink}
      duration={duration}
      expandX={expandX}
      expandY={expandY}
      open={open}
      setOpen={setOpen}
    >
      <div role='none' className={mx('overflow-hidden', !shrink && 'is-full', classNames)}>
        {children}
      </div>
    </ToggleContainerContext>
  );
};

//
// Header
//

type HeaderProps = ThemedClassName<
  PropsWithChildren<{
    icon?: JSX.Element;
    shrink?: boolean;
  }>
>;

const Header = ({ classNames, children, icon }: HeaderProps) => {
  const { open, setOpen, shrink, duration } = useToggleContainerContext(Header.displayName);

  return (
    <div
      className={mx('is-full p-1 grid grid-cols-[24px_1fr_24px] gap-1 cursor-pointer select-none', classNames)}
      onClick={() => setOpen(!open)}
    >
      <IconBlock>
        <Icon
          size={4}
          icon={'ph--caret-right--regular'}
          style={{ transitionDuration: `${shrink ? duration * 2 : duration}ms` }}
          classNames={['transition transition-transform ease-in-out', open ? 'rotate-90' : 'transform-none']}
        />
      </IconBlock>
      <div className='flex items-center overflow-hidden truncate'>{children}</div>
      {icon && <IconBlock>{icon}</IconBlock>}
    </div>
  );
};

Header.displayName = 'ToggleContainer.Header';

//
// Content
//

type ContentProps = ThemedClassName<PropsWithChildren>;

const Content = ({ classNames, children }: ContentProps) => {
  const { duration, expandX, expandY } = useToggleContainerContext(Content.displayName);

  return (
    <div
      role='none'
      style={{ transitionDuration: `${duration}ms` }}
      className={mx(
        'grid transition-[grid-template-columns] ease-in-out',
        expandX ? 'grid-cols-[1fr]' : 'grid-cols-[0fr]',
      )}
    >
      <div className='overflow-hidden'>
        <div
          role='none'
          style={{ transitionDuration: `${duration}ms` }}
          className={mx(
            'grid transition-[grid-template-rows] ease-in-out',
            expandY ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
          )}
        >
          <div className={mx('min-h-0 overflow-y-auto', classNames)}>{children}</div>
        </div>
      </div>
    </div>
  );
};

Content.displayName = 'ToggleContainer.Content';

//
// ToggleContainer
//

export const ToggleContainer = {
  Root,
  Header,
  Content,
};

export type {
  RootProps as ToggleContainerRootProps,
  HeaderProps as ToggleContainerHeaderProps,
  ContentProps as ToggleContainerContentProps,
};
