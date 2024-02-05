//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Main } from '@dxos/react-ui';
import { topbarBlockPaddingStart } from '@dxos/react-ui-theme';

export const MainLayout = ({ children }: PropsWithChildren) => {
  return (
    <Main.Content
      bounce
      classNames={[
        'grid grid-cols-1 grid-rows-[min-content_1fr] justify-center content-start overflow-hidden',
        topbarBlockPaddingStart,
      ]}
    >
      {children}
    </Main.Content>
  );
};

// Used when the editor is embedded in another context (e.g., iframe) and has no topbar/sidebar/etc.
// TODO(wittjosiah): What's the difference between this and Section/Card?
export const EmbeddedLayout = ({ children }: PropsWithChildren) => {
  return <Main.Content classNames='min-bs-[100dvh]'>{children}</Main.Content>;
};
