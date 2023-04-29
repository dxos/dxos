//
// Copyright 2023 DXOS.org
//

import { List, MagnifyingGlass, CaretLeft, CaretRight } from '@phosphor-icons/react';
import React, { FC, ReactNode, Suspense, useContext, useEffect, useState } from 'react';
import { createMemoryRouter, RouterProvider, useLocation, useNavigate, useParams } from 'react-router-dom';

import { Event } from '@dxos/async';
import { Button, ThemeProvider } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { raise } from '@dxos/debug';
import { FullscreenDecorator } from '@dxos/kai-frames';
import { appkitTranslations, Input } from '@dxos/react-appkit';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';
import { osTranslations, PanelSidebarContext, PanelSidebarProvider, useTogglePanelSidebar } from '@dxos/react-shell';

import '@dxosTheme';

/**
 * Manages current state of all surfaces.
 */
class SurfaceController {
  private readonly components: Record<string, FC> = {};
  readonly state: Record<string, string | undefined> = {};
  readonly update = new Event<string>();

  constructor(components?: Record<string, FC>) {
    Object.entries(components ?? {}).forEach(([id, component]) => this.registerComponent(id, component));
  }

  setState(id: string, component?: string) {
    this.state[id] = component;
    this.update.emit(id);
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

const SurfaceControllerContext = React.createContext<{ controller: SurfaceController }>({
  controller: new SurfaceController()
});

const SurfaceControllerContextProvider: FC<{
  children: ReactNode;
  components?: Record<string, FC>;
}> = ({ children, components }) => {
  const controller = new SurfaceController(components);
  return <SurfaceControllerContext.Provider value={{ controller }}>{children}</SurfaceControllerContext.Provider>;
};

/**
 * Context for a surface.
 */
const SurfaceContext = React.createContext<{ id: string; component?: string } | undefined>(undefined);

type SurfaceProps = {
  id: string;
  element?: ReactNode;
};

/**
 * Surface container implements chrome and contains content outlet.
 */
const Surface = ({ id, element }: SurfaceProps) => {
  const { controller } = useContext(SurfaceControllerContext);
  const [component, setComponent] = useState<string | undefined>(controller.state[id]);
  useEffect(() => controller.update.on((surface) => surface === id && setComponent(controller.state[id])), []);

  return (
    // prettier-ignore
    <SurfaceContext.Provider value={{ id, component }}>
      {element ?? <SurfaceOutlet />}
    </SurfaceContext.Provider>
  );
};

/**
 * Surface content.
 */
const SurfaceOutlet = () => {
  const { component } = useContext(SurfaceContext) ?? raise(new Error('Missing SurfaceContext.'));
  const { controller } = useContext(SurfaceControllerContext);
  const Content = controller.getComponent(component);
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
  const { controller } = useContext(SurfaceControllerContext);

  return (
    <div className='flex flex-col grow bs-full bg-zinc-200'>
      <div className='flex justify-between h-[32px] px-2 items-center'>
        <div className='flex'>
          <Button onClick={() => controller.setState('sidebar', 'navigator')}>
            <List className={getSize(5)} />
          </Button>
          <Button onClick={() => controller.setState('sidebar', 'search')}>
            <MagnifyingGlass className={getSize(5)} />
          </Button>
        </div>
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
// Components
//

const Debug = () => {
  const { pathname } = useLocation();
  const surface = useContext(SurfaceContext);
  const { controller } = useContext(SurfaceControllerContext);
  const [surfaces, setSurfaces] = useState(controller.state);
  useEffect(() => controller.update.on(() => setSurfaces({ ...controller.state })), []);

  return (
    <div className='p-2'>
      <pre className='text-sm'>{JSON.stringify({ pathname, surface, surfaces }, undefined, 2)}</pre>
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
  // TODO(burdon): Decouple router with events.
  const navigate = useNavigate();
  const { main } = useParams();
  const handleSelect = (component: string | undefined) => {
    navigate(`/${component ?? ''}`);
  };

  const navItems = [
    { label: 'Reset' },
    { label: 'Component 1', component: 'component-1' },
    { label: 'Component 2', component: 'component-2' },
    { label: 'Component 3', component: 'component-3' }
  ];

  return (
    <ul className='py-4'>
      {navItems.map(({ label, component }, i) => (
        <li
          key={i}
          className={mx('px-2 cursor-pointer', component === main && 'bg-green-200')}
          onClick={() => handleSelect(component)}
        >
          {label}
        </li>
      ))}
    </ul>
  );
};

const Search = () => {
  return (
    <div className='flex'>
      <Input
        label='search'
        labelVisuallyHidden
        placeholder='Search'
        variant='subdued'
        slots={{
          root: { className: 'w-full p-2' },
          // TODO(burdon): Classname ignored.
          input: { className: 'w-full', autoFocus: true, spellCheck: false }
        }}
      />
    </div>
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
// Layout
//

const PanelSidebarContent: FC<{ children: ReactNode }> = ({ children }) => {
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
  // Decouple router.
  const { controller } = useContext(SurfaceControllerContext);
  const { main } = useParams();
  useEffect(() => {
    controller.setState('debug', 'debug');
    controller.setState('sidebar', 'navigator');
    controller.setState('main', main);
  }, [main]);

  return (
    <PanelSidebarProvider
      inlineStart
      slots={{
        main: { className: 'flex grow overflow-hidden' },
        content: {
          children: <Surface id='sidebar' element={<SidebarSurface />} />
        }
      }}
    >
      <PanelSidebarContent>
        <Surface id='main' element={<MainSurface />} />
        <Surface id='debug' />
      </PanelSidebarContent>
    </PanelSidebarProvider>
  );
};

const TestApp = () => {
  // TODO(burdon): Components defined by plugins.
  // prettier-ignore
  const components = {
    'debug': Debug,
    'navigator': Navigator,
    'search': Search,
    'component-1': Component1,
    'component-2': Component2,
    'component-3': Component3
  };

  const Root = () => (
    <ThemeProvider appNs='kai' rootDensity='fine' resourceExtensions={[osTranslations, appkitTranslations]}>
      <SurfaceControllerContextProvider components={components}>
        <Layout />
      </SurfaceControllerContextProvider>
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
