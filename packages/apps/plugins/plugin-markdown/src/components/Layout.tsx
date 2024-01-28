//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Main } from '@dxos/react-ui';
import { baseSurface, mx, textBlockWidth, topbarBlockPaddingStart } from '@dxos/react-ui-theme';

export const MainLayout = ({ children }: PropsWithChildren) => {
  return (
    <Main.Content bounce classNames={[baseSurface, topbarBlockPaddingStart]}>
      <div role='none' className={mx('flex flex-col h-full pli-2', textBlockWidth)}>
        <div role='none' className='flex flex-col grow pb-8 overflow-y-auto'>
          {children}
        </div>
      </div>
    </Main.Content>
  );
};

// Used when the editor is embedded in another context (e.g., iframe) and has no topbar/sidebar/etc.
// TODO(wittjosiah): What's the difference between this and Section/Card?
export const EmbeddedLayout = ({ children }: PropsWithChildren<{}>) => {
  return <Main.Content classNames='min-bs-[100dvh] flex flex-col p-0.5'>{children}</Main.Content>;
};
