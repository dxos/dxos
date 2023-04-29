//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import React, { FC, ReactNode, Suspense, useContext } from 'react';
import { createMemoryRouter, RouterProvider, useNavigate, useParams } from 'react-router-dom';

import { Button, ThemeProvider } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { raise } from '@dxos/debug';
import { FullscreenDecorator } from '@dxos/kai-frames';
import { appkitTranslations } from '@dxos/react-appkit';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';
import { osTranslations, PanelSidebarContext, PanelSidebarProvider, useTogglePanelSidebar } from '@dxos/react-shell';

import '@dxosTheme';

/**
 * Manages current state of all surfaces.
 */
class SurfaceManager {
  private readonly components: Record<string, FC> = {};
  readonly state: Record<string, string | undefined> = {};

  constructor(components?: Record<string, FC>) {
    Object.entries(components ?? {}).forEach(([id, component]) => this.registerComponent(id, component));
  }

  setState(id: string, component?: string) {
    this.state[id] = component;
  }

  registerComponent(id: string, components: FC) {
    this.components[id] = components;
  }

  getComponent(id: string | undefined) {
    if (id) {
      return this.components[id];
    }
  }
}

const SurfaceManagerContext = React.createContext<{ manager: SurfaceManager }>({ manager: new SurfaceManager() });

const SurfaceManagerContextProvider: FC<{
  children: ReactNode;
  components?: Record<string, FC>;
}> = ({ children, components }) => {
  const manager = new SurfaceManager(components);
  return <SurfaceManagerContext.Provider value={{ manager }}>{children}</SurfaceManagerContext.Provider>;
};

/**
 * Context for a surface.
 */
const SurfaceContext = React.createContext<{ id: string; component?: string } | undefined>(undefined);

type SurfaceProps = {
  id: string;
  element?: ReactNode;
  component: string | undefined;
};

/**
 * Surface container implements chrome and contains content outlet.
 */
const Surface = ({ id, element, component }: SurfaceProps) => {
  const { manager } = useContext(SurfaceManagerContext);
  manager.setState(id, component);

  return <SurfaceContext.Provider value={{ id, component }}>{element ?? <SurfaceOutlet />}</SurfaceContext.Provider>;
};

/**
 * Surface content.
 */
const SurfaceOutlet = () => {
  const { manager } = useContext(SurfaceManagerContext);
  const { component } = useContext(SurfaceContext) ?? raise(new Error('Missing SurfaceContext.'));
  const Content = manager.getComponent(component);
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
// App surfaces
//

const SidebarSurface = () => {
  const toggleSidebar = useTogglePanelSidebar();

  return (
    <div className='flex flex-col grow bs-full bg-zinc-200'>
      <div className='flex flex-row-reverse h-[32px] px-2 items-center'>
        <Button onClick={toggleSidebar}>
          <CaretLeft className={getSize(5)} />
        </Button>
      </div>

      <SurfaceOutlet />
      <Info />
    </div>
  );
};

const MainSurface = () => {
  return (
    <div className='flex flex-col grow overflow-y-scroll'>
      <SurfaceOutlet />
      <Info />
    </div>
  );
};

//
// App content
//

const Debug = () => {
  const surface = useContext(SurfaceContext);
  const {
    manager: { state: global }
  } = useContext(SurfaceManagerContext);
  return (
    <div className='p-2'>
      <pre className='text-sm'>{JSON.stringify({ surface, global }, undefined, 2)}</pre>
    </div>
  );
};

const Info = () => {
  const surface = useContext(SurfaceContext);
  return (
    <div className='p-2'>
      <pre className='text-sm'>{JSON.stringify({ surface }, undefined, 2)}</pre>
    </div>
  );
};

const Navigator: FC = () => {
  // TODO(burdon): Decouple router.
  const navigate = useNavigate();
  const { main } = useParams();

  const items = [
    { label: 'Reset' },
    { label: 'Component 1', component: 'component-1' },
    { label: 'Component 2', component: 'component-2' },
    { label: 'Component 3', component: 'component-3' }
  ];

  return (
    <ul>
      {items.map(({ label, component }, i) => (
        <li
          key={i}
          className={mx('px-2 cursor-pointer', component === main && 'bg-green-200')}
          onClick={() => navigate(`/${component ?? ''}`)}
        >
          {label}
        </li>
      ))}
    </ul>
  );
};

const Component1 = () => (
  <div className='p-2'>
    <h1>Component 1</h1>
  </div>
);

const Component2 = () => (
  <div className='p-2'>
    <h1>Component 2</h1>
  </div>
);

const Component3 = () => (
  <div className='p-2'>
    <h1>Component 3</h1>
  </div>
);

//
// Stories
//

const PanelMain: FC<{ children: ReactNode }> = ({ children }) => {
  const { displayState } = useContext(PanelSidebarContext);
  const toggleSidebar = useTogglePanelSidebar();
  return (
    <div className='flex grow overflow-hidden'>
      {displayState !== 'show' && (
        <div className='flex flex-col h-full px-2'>
          <div className='flex h-[32px] items-center'>
            <Button onClick={toggleSidebar}>
              <CaretRight className={getSize(5)} />
            </Button>
          </div>
        </div>
      )}
      <div className='flex flex-col grow overflow-hidden divide-y divide-zinc-300'>{children}</div>
    </div>
  );
};

const Layout = () => {
  const { main } = useParams();

  return (
    <PanelSidebarProvider
      inlineStart
      slots={{
        main: { className: 'flex grow overflow-hidden' },
        content: {
          children: <Surface id='sidebar' element={<SidebarSurface />} component='navigator' />
        }
      }}
    >
      <PanelMain>
        <Surface id='main' element={<MainSurface />} component={main} />
        <Surface id='debug' component='debug' />
      </PanelMain>
    </PanelSidebarProvider>
  );
};

const TestApp = () => {
  // TODO(burdon): Surfaces defined by plugins.
  // prettier-ignore
  const components = {
    'navigator': Navigator,
    'component-1': Component1,
    'component-2': Component2,
    'component-3': Component3,
    'debug': Debug
  };

  const Root = () => (
    <ThemeProvider appNs='kai' rootDensity='fine' resourceExtensions={[appkitTranslations, osTranslations]}>
      <SurfaceManagerContextProvider components={components}>
        <Layout />
      </SurfaceManagerContextProvider>
    </ThemeProvider>
  );

  const router = createMemoryRouter([
    {
      path: '/',
      element: <Root />,
      children: [
        {
          path: '/:main',
          element: <Root />
        }
      ]
    }
  ]);

  return <RouterProvider router={router} />;
};

export default {
  component: Surface,
  decorators: [FullscreenDecorator(), ClientSpaceDecorator()],
  parameters: {
    layout: 'fullscreen'
  }
};

export const Default = {
  render: () => <TestApp />
};
