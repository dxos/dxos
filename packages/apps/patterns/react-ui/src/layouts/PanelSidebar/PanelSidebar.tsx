//
// Copyright 2023 DXOS.org
//

import { Transition } from '@headlessui/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import React, {
  createContext,
  Dispatch,
  Fragment,
  PropsWithChildren,
  ReactNode,
  SetStateAction,
  useCallback,
  useContext,
  useState
} from 'react';

import { defaultOverlay, mx, useTranslation } from '@dxos/react-components';

export type PanelSidebarState = 'show' | 'hide';

export interface PanelSidebarContextValue {
  setDisplayState: Dispatch<SetStateAction<PanelSidebarState>>;
  displayState: PanelSidebarState;
}

export const PanelSidebarContext = createContext<PanelSidebarContextValue>({
  displayState: 'hide',
  setDisplayState: () => {}
});

export const useTogglePanelSidebar = () => {
  const { displayState, setDisplayState } = useContext(PanelSidebarContext);
  return useCallback(() => {
    setDisplayState(displayState === 'hide' ? 'show' : 'hide');
  }, [displayState]);
};

export interface PanelSidebarProviderProps {
  inlineStart?: boolean;
  fixedBlockStartChildren?: ReactNode;
  fixedBlockEndChildren?: ReactNode;
}

export const PanelSidebarProvider = ({
  children,
  inlineStart,
  fixedBlockStartChildren,
  fixedBlockEndChildren
}: PropsWithChildren<PanelSidebarProviderProps>) => {
  const { t } = useTranslation('os');
  const [displayState, setDisplayState] = useState<PanelSidebarState>('hide');
  const isOpen = displayState === 'show';
  return (
    <PanelSidebarContext.Provider value={{ setDisplayState, displayState }}>
      <DialogPrimitive.Root open={isOpen}>
        <Transition
          show={isOpen}
          as={Fragment}
          enter='ease-in-out duration-200'
          enterFrom='inline-start-[-272px]'
          enterTo='inline-start-0'
          leave='ease-in-out duration-200'
          leaveFrom='inline-start-0'
          leaveTo='inline-start-[-272px]'
        >
          <DialogPrimitive.Content
            className={mx('fixed block-start-0 block-end-0 is-[272px] z-50', 'bg-neutral-50 dark:bg-neutral-950')}
          >
            <DialogPrimitive.Title className='sr-only'>{t('sidebar label')}</DialogPrimitive.Title>
            Hello this is sidebar
          </DialogPrimitive.Content>
        </Transition>
        {fixedBlockStartChildren && (
          <div
            role='none'
            className={mx(
              'fixed is-[100vw] block-start-0 z-[49] transition-[inset-inline-start,inset-inline-end] duration-200 ease-in-out',
              isOpen ? 'inline-start-[272px]' : 'inline-start-0'
            )}
          >
            {fixedBlockStartChildren}
          </div>
        )}
        <Transition
          show={isOpen}
          as={Fragment}
          enter='linear duration-200'
          enterFrom='opacity-0'
          enterTo='opacity-100'
          leave='linear duration-200'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        >
          <DialogPrimitive.Overlay className={defaultOverlay} onClick={() => setDisplayState('hide')} />
        </Transition>
        {children}
      </DialogPrimitive.Root>
    </PanelSidebarContext.Provider>
  );
};
