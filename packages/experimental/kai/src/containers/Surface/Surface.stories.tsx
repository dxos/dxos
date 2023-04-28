//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import React, { FC, ReactNode, Suspense, useContext, useEffect, useState } from 'react';

import { Event } from '@dxos/async';
import { Button, ThemeProvider } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { raise } from '@dxos/debug';
import { FullscreenDecorator } from '@dxos/kai-frames';
import { appkitTranslations } from '@dxos/react-appkit';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';
import { osTranslations, PanelSidebarContext, PanelSidebarProvider, useTogglePanelSidebar } from '@dxos/react-shell';

import '@dxosTheme';

// TODO(burdon): Actions/App state/Routes (e.g., get/set SurfaceManager state from URL).

/**
 * Manages current state of all surfaces.
 */
class SurfaceManager {
  private readonly surfaces: Record<string, FC> = {};
  private readonly state: Record<string, string | undefined> = {};
  readonly updated = new Event<string>();

  constructor(surfaces?: Record<string, FC>) {
    Object.entries(surfaces ?? {}).forEach(([id, component]) => this.registerSurface(id, component));
  }

  registerSurface(id: string, surface: FC) {
    this.surfaces[id] = surface;
  }

  setSurface(id: string, surface: string | undefined) {
    this.state[id] = surface;
    this.updated.emit(id);
  }

  getSurface(id: string) {
    const component = this.state[id];
    return component ? this.surfaces[component] : undefined;
  }
}

const SurfaceManagerContext = React.createContext<{ manager: SurfaceManager }>({ manager: new SurfaceManager() });

const SurfaceManagerContextProvider: FC<{
  children: ReactNode;
  surfaces?: Record<string, FC>;
  state?: Record<string, string>;
}> = ({ children, surfaces, state }) => {
  const manager = new SurfaceManager(surfaces);
  Object.entries(state ?? {}).forEach(([id, surface]) => manager.setSurface(id, surface));

  return <SurfaceManagerContext.Provider value={{ manager }}>{children}</SurfaceManagerContext.Provider>;
};

/**
 * Context for a surface.
 */
const SurfaceContext = React.createContext<{ id: string } | undefined>(undefined);

/**
 * Surface container implements chrome and contains content outlet.
 */
const Surface: FC<{ id: string; children: ReactNode; className?: string }> = ({ id, children, className }) => {
  return (
    <SurfaceContext.Provider value={{ id }}>
      <div className={mx('flex flex-1 bs-full', className)}>{children}</div>;
    </SurfaceContext.Provider>
  );
};

/**
 * Surface content.
 */
const SurfaceOutlet = () => {
  const { manager } = useContext(SurfaceManagerContext);
  const { id } = useContext(SurfaceContext) ?? raise(new Error('Missing SurfaceContext.'));
  const [, forceUpdate] = useState({});
  useEffect(() => {
    const subscription = manager.updated.on((updated) => {
      if (id === updated) {
        forceUpdate({});
      }
    });

    return () => subscription();
  }, []);

  const Content = manager.getSurface(id);
  if (!Content) {
    return null;
  }

  return (
    <Suspense>
      <Content />
    </Suspense>
  );
};

//
// Stories
//

export default {
  component: Surface,
  decorators: [FullscreenDecorator(), ClientSpaceDecorator()],
  parameters: {
    layout: 'fullscreen'
  }
};

//
// App surfaces
//

const SidebarSurface = () => {
  const toggleSidebar = useTogglePanelSidebar();

  return (
    <Surface id='sidebar' className='bg-zinc-200'>
      <div className='flex flex-col grow'>
        <div className='flex flex-row-reverse h-[32px] px-2 items-center'>
          <Button onClick={toggleSidebar}>
            <CaretLeft className={getSize(5)} />
          </Button>
        </div>

        <SurfaceOutlet />
      </div>
    </Surface>
  );
};

const MainSurface = () => {
  const toggleSidebar = useTogglePanelSidebar();
  const { displayState } = useContext(PanelSidebarContext);

  return (
    <Surface id='main'>
      {displayState !== 'show' && (
        <div className='flex flex-col h-full px-2'>
          <div className='flex h-[32px] items-center'>
            <Button onClick={toggleSidebar}>
              <CaretRight className={getSize(5)} />
            </Button>
          </div>
        </div>
      )}

      <div className='px-2 py-1'>
        <SurfaceOutlet />
      </div>
    </Surface>
  );
};

//
// App content
//

const Navigator: FC = () => {
  const { manager } = useContext(SurfaceManagerContext);

  const items = [
    { label: 'Reset' },
    { label: 'Item 1', component: 'component-1' },
    { label: 'Item 2', component: 'component-2' },
    { label: 'Item 3', component: 'component-3' }
  ];

  return (
    <div className='px-2'>
      <ul>
        {items.map(({ label, component }, i) => (
          <li key={i} className='cursor-pointer' onClick={() => manager.setSurface('main', component)}>
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
};

const Component1: FC = () => <div>Component 1</div>;
const Component2: FC = () => <div>Component 2</div>;
const Component3: FC = () => <div>Component 3</div>;

//
// App shell
//

const TestApp = () => {
  // prettier-ignore
  const surfaces = {
    'navigator': Navigator,
    'component-1': Component1,
    'component-2': Component2,
    'component-3': Component3
  };

  return (
    <ThemeProvider appNs='kai' rootDensity='fine' resourceExtensions={[appkitTranslations, osTranslations]}>
      <SurfaceManagerContextProvider surfaces={surfaces} state={{ sidebar: 'navigator', main: 'component-1' }}>
        <PanelSidebarProvider
          inlineStart
          slots={{
            content: {
              children: <SidebarSurface />
            }
          }}
        >
          <MainSurface />
        </PanelSidebarProvider>
      </SurfaceManagerContextProvider>
    </ThemeProvider>
  );
};

export const Default = {
  render: () => <TestApp />
};
