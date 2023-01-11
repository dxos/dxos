//
// Copyright 2023 DXOS.org
//

import * as DialogPrimitive from '@radix-ui/react-dialog';
import React, {
  createContext,
  Dispatch,
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
  return (
    <PanelSidebarContext.Provider value={{ setDisplayState, displayState }}>
      <DialogPrimitive.Root open={displayState === 'show'}>
        <DialogPrimitive.Content
          className={mx(
            'fixed block-start-0 block-end-0 is-[272px] z-50',
            'bg-neutral-50 dark:bg-neutral-950',
            inlineStart ? 'inline-start-0' : 'inline-end-0'
          )}
        >
          <DialogPrimitive.Title className='sr-only'>{t('sidebar label')}</DialogPrimitive.Title>
          Hello this is sidebar
        </DialogPrimitive.Content>
        {fixedBlockStartChildren && (
          <div
            role='none'
            className={mx(
              'fixed inline-start-0 is-[100vw] block-start-0 z-[49]',
              displayState === 'show' && 'inline-start-[272px]'
            )}
          >
            {fixedBlockStartChildren}
          </div>
        )}
        <DialogPrimitive.Overlay className={defaultOverlay} onClick={() => setDisplayState('hide')} />
        {children}
      </DialogPrimitive.Root>
    </PanelSidebarContext.Provider>
  );
};
