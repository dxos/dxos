//
// Copyright 2023 DXOS.org
//

import * as DialogPrimitive from '@radix-ui/react-dialog';
import React, {
  ComponentProps,
  createContext,
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  useCallback,
  useContext,
  useState
} from 'react';

import { useMediaQuery, useTranslation } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';
import { defaultOverlay } from '@dxos/react-appkit';

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
  content?: ComponentProps<typeof DialogPrimitive.Content>;
  main?: ComponentProps<'div'>;
}

export interface PanelSidebarProviderProps {
  inlineStart?: boolean;
  slots?: PanelSidebarProviderSlots;
}

export const PanelSidebarProvider = ({ children, slots }: PropsWithChildren<PanelSidebarProviderProps>) => {
  const { t } = useTranslation('os');
  const [isLg] = useMediaQuery('lg', { ssr: false });
  const [displayState, setInternalDisplayState] = useState<PanelSidebarState>(isLg ? 'show' : 'hide');
  const isOpen = displayState === 'show';
  const [transitionShow, setTransitionShow] = useState(isOpen);
  const [domShow, setDomShow] = useState(isOpen);

  const internalHide = () => {
    setTransitionShow(false);
    setInternalDisplayState('hide');
    setTimeout(() => {
      setDomShow(false);
    }, 200);
  };

  const internalShow = () => {
    setDomShow(true);
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
      <DialogPrimitive.Root open={domShow} modal={false}>
        {/* todo(thure): Why does DialogPrimitive.Overlay not render any element here? */}
        {!isLg && (
          <div
            role='none'
            className={mx(
              defaultOverlay,
              'transition-opacity duration-200 ease-in-out',
              transitionShow ? 'opacity-100' : 'opacity-0',
              domShow ? 'block' : 'hidden'
            )}
            onClick={internalHide}
          />
        )}

        {/* Sidebar. */}
        <DialogPrimitive.Content
          onOpenAutoFocus={(event) => isLg && event.preventDefault()}
          onCloseAutoFocus={(event) => isLg && event.preventDefault()}
          {...slots?.content}
          className={mx(
            'fixed block-start-0 block-end-0 is-sidebar z-30 overscroll-contain overflow-x-hidden overflow-y-auto',
            'transition-[inset-inline-start,inset-inline-end] duration-200 ease-in-out',
            transitionShow ? 'inline-start-0' : '-inline-start-sidebar',
            slots?.content?.className
          )}
        >
          <DialogPrimitive.Title className='sr-only'>{t('sidebar label')}</DialogPrimitive.Title>
          {slots?.content?.children}
        </DialogPrimitive.Content>

        {/* Main content. */}
        <div
          role='none'
          {...slots?.main}
          className={mx(
            'transition-[padding-inline-start] duration-200 ease-in-out',
            isLg && isOpen ? 'pis-sidebar' : 'pis-0',
            slots?.main?.className
          )}
        >
          {children}
        </div>
      </DialogPrimitive.Root>
    </PanelSidebarContext.Provider>
  );
};
