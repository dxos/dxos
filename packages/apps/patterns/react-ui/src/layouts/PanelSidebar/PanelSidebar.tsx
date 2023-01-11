//
// Copyright 2023 DXOS.org
//

import * as DialogPrimitive from '@radix-ui/react-dialog';
import React, {
  ComponentProps,
  createContext,
  Dispatch,
  Fragment,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useContext,
  useState
} from 'react';

import { defaultOverlay, mx, useMediaQuery, useTranslation } from '@dxos/react-components';

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

export interface PanelSidebarProviderSlots {
  content?: ComponentProps<typeof Fragment>;
  fixedBlockStart?: ComponentProps<'div'>;
  fixedBlockEnd?: ComponentProps<'div'>;
}

export interface PanelSidebarProviderProps {
  inlineStart?: boolean;
  slots?: PanelSidebarProviderSlots;
}

export const PanelSidebarProvider = ({
  children,
  inlineStart,
  slots
}: PropsWithChildren<PanelSidebarProviderProps>) => {
  const { t } = useTranslation('os');
  const [displayState, setInternalDisplayState] = useState<PanelSidebarState>('hide');
  const [transitionShow, setTransitionShow] = useState(false);
  const isOpen = displayState === 'show';

  const [isLg] = useMediaQuery('lg');

  const internalHide = () => {
    setTransitionShow(false);
    setTimeout(() => {
      setInternalDisplayState('hide');
    }, 200);
  };
  const internalShow = () => {
    setInternalDisplayState('show');
    setTimeout(() => {
      setTransitionShow(true);
      // todo (thure): this may be a race condition in certain situations
    }, 0);
  };
  const setDisplayState = (displayState: SetStateAction<PanelSidebarState>) =>
    displayState === 'show' ? internalShow() : internalHide();

  return (
    <PanelSidebarContext.Provider value={{ setDisplayState, displayState }}>
      <DialogPrimitive.Root open={isOpen} modal={!isLg}>
        <DialogPrimitive.Content
          className={mx(
            'fixed block-start-0 block-end-0 is-[272px] z-50 transition-[inset-inline-start,inset-inline-end] duration-200 ease-in-out',
            'bg-neutral-50 dark:bg-neutral-950',
            transitionShow ? 'inline-start-0' : 'inline-start-[-272px]'
          )}
        >
          <DialogPrimitive.Title className='sr-only'>{t('sidebar label')}</DialogPrimitive.Title>
          <Fragment {...slots?.content} />
        </DialogPrimitive.Content>
        {slots?.fixedBlockStart && (
          <div
            role='none'
            {...slots?.fixedBlockStart}
            className={mx(
              'fixed inline-end-0 block-start-0 z-[49] transition-[inset-inline-start,inset-inline-end] duration-200 ease-in-out',
              transitionShow ? 'inline-start-[272px]' : 'inline-start-0',
              slots?.fixedBlockStart?.className
            )}
          >
            {slots?.fixedBlockStart?.children}
          </div>
        )}
        {!isLg && (
          <DialogPrimitive.Overlay
            className={mx(
              defaultOverlay,
              'transition-opacity duration-200 ease-in-out',
              transitionShow ? 'opacity-100' : 'opacity-0'
            )}
            onClick={internalHide}
          />
        )}
        <div
          role='none'
          className={mx(
            'bs-full transition-[padding-inline-start] duration-200 ease-in-out',
            isLg && isOpen ? 'pis-[272px]' : 'pis-0'
          )}
        >
          {children}
        </div>
      </DialogPrimitive.Root>
    </PanelSidebarContext.Provider>
  );
};
