//
// Copyright 2023 DXOS.org
//

import { ErrorBoundary } from '@sentry/react';
import React, { FC, PropsWithChildren } from 'react';
import { Outlet } from 'react-router-dom';

import { appkitTranslations, ErrorProvider, ResetDialog, ThemeProvider } from '@dxos/react-appkit';
import { fromHost, ClientProvider, Config, Defaults, Envs, Local } from '@dxos/react-client';
import { osTranslations } from '@dxos/react-shell';

const Fullscreen: FC<PropsWithChildren> = ({ children }) => {
  return <div className='flex flex-col overflow-hidden absolute left-0 right-0 top-0 bottom-0'>{children}</div>;
};

export const Root: FC<PropsWithChildren> = ({ children }) => {
  const configProvider = async () => new Config(/* await Dynamics(), */ await Envs(), Local(), Defaults());

  return (
    <ThemeProvider appNs='console' rootDensity='fine' resourceExtensions={[appkitTranslations, osTranslations]}>
      <ErrorProvider config={configProvider}>
        <ErrorBoundary fallback={({ error }) => <ResetDialog error={error} config={configProvider} />}>
          <ClientProvider config={configProvider} services={fromHost}>
            <Fullscreen>
              <Outlet />
            </Fullscreen>
            {children}
          </ClientProvider>
        </ErrorBoundary>
      </ErrorProvider>
    </ThemeProvider>
  );
};
