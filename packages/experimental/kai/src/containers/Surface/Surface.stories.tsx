//
// Copyright 2023 DXOS.org
//

<<<<<<< HEAD
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import React, { FC, ReactNode, Suspense, useContext } from 'react';
import { createMemoryRouter, RouterProvider, useNavigate, useParams } from 'react-router-dom';
=======
import { Circle, List, MagnifyingGlass, CaretLeft, CaretRight } from '@phosphor-icons/react';
import React, { FC, ReactNode, Suspense, useContext, useEffect, useState } from 'react';
import { createMemoryRouter, RouterProvider, useLocation, useNavigate, useParams } from 'react-router-dom';
>>>>>>> 6076c428c66cd819ac1dc39035e3c0b96592cf5e

import { Event } from '@dxos/async';
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
<<<<<<< HEAD
class SurfaceManager {
  private readonly components: Record<string, FC> = {};
  readonly state: Record<string, string | undefined> = {};
=======
class SurfaceController {
  private readonly components: Record<string, FC> = {};
  readonly state: Record<string, string | undefined> = {};
  readonly update = new Event<string>();
>>>>>>> 6076c428c66cd819ac1dc39035e3c0b96592cf5e

  constructor(components?: Record<string, FC>) {
    Object.entries(components ?? {}).forEach(([id, component]) => this.registerComponent(id, component));
  }

  setState(id: string, component?: string) {
    this.state[id] = component;
<<<<<<< HEAD
=======
    this.update.emit(id);
>>>>>>> 6076c428c66cd819ac1dc39035e3c0b96592cf5e
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
<<<<<<< HEAD
  const manager = new SurfaceManager(components);
  return <SurfaceManagerContext.Provider value={{ manager }}>{children}</SurfaceManagerContext.Provider>;
=======
  const controller = new SurfaceController(components);
  return <SurfaceControllerContext.Provider value={{ controller }}>{children}</SurfaceControllerContext.Provider>;
>>>>>>> 6076c428c66cd819ac1dc39035e3c0b96592cf5e
};

/**
 * Context for a surface.
 */
const SurfaceContext = React.createContext<{ id: string; component?: string } | undefined>(undefined);

type SurfaceProps = {
  id: string;
  element?: ReactNode;
<<<<<<< HEAD
  component: string | undefined;
=======
>>>>>>> 6076c428c66cd819ac1dc39035e3c0b96592cf5e
};

/**
 * Surface container implements chrome and contains content outlet.
 */
<<<<<<< HEAD
const Surface = ({ id, element, component }: SurfaceProps) => {
  const { manager } = useContext(SurfaceManagerContext);
  manager.setState(id, component);

  return <SurfaceContext.Provider value={{ id, component }}>{element ?? <SurfaceOutlet />}</SurfaceContext.Provider>;
=======
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
>>>>>>> 6076c428c66cd819ac1dc39035e3c0b96592cf5e
};

/**
 * Surface content.
 */
const SurfaceOutlet = () => {
<<<<<<< HEAD
  const { manager } = useContext(SurfaceManagerContext);
  const { component } = useContext(SurfaceContext) ?? raise(new Error('Missing SurfaceContext.'));
  const Content = manager.getComponent(component);
=======
  const { component } = useContext(SurfaceContext) ?? raise(new Error('Missing SurfaceContext.'));
  const { controller } = useContext(SurfaceControllerContext);
  const Content = controller.getComponent(component);
>>>>>>> 6076c428c66cd819ac1dc39035e3c0b96592cf5e
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
<<<<<<< HEAD
      <div className='flex flex-row-reverse h-[32px] px-2 items-center'>
        <Button onClick={toggleSidebar}>
          <CaretLeft className={getSize(5)} />
        </Button>
=======
      <div className='flex justify-between h-[32px] px-2 items-center'>
        <div className='flex'>
          <Button onClick={() => controller.setState('sidebar', 'navigator')}>
            <List className={getSize(5)} />
          </Button>
          <Button onClick={() => controller.setState('sidebar', 'search')}>
            <MagnifyingGlass className={getSize(5)} />
          </Button>
        </div>
        <div>
          <Button onClick={toggleSidebar}>
            <CaretLeft className={getSize(5)} />
          </Button>
        </div>
>>>>>>> 6076c428c66cd819ac1dc39035e3c0b96592cf5e
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
<<<<<<< HEAD
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
=======
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
>>>>>>> 6076c428c66cd819ac1dc39035e3c0b96592cf5e
    </div>
  );
};

const Info = () => {
  const surface = useContext(SurfaceContext);
<<<<<<< HEAD
=======

>>>>>>> 6076c428c66cd819ac1dc39035e3c0b96592cf5e
  return (
    <div className='p-2'>
      <pre className='text-sm'>{JSON.stringify({ surface }, undefined, 2)}</pre>
    </div>
  );
};

const Navigator: FC = () => {
<<<<<<< HEAD
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
=======
  // TODO(burdon): Decouple router with events.
  const navigate = useNavigate();
  const { main, object } = useParams();
  const handleSelect = (component: string | undefined, objectId?: string) => {
    navigate(`/${component ?? ''}` + (objectId ? `/${objectId}` : ''));
  };

  const tree = [
    { label: 'Reset' },
    { label: 'Component 1', component: 'component-1' },
    { label: 'Component 2', component: 'component-2', objects: ['1'] },
    { label: 'Component 3', component: 'component-3', objects: ['2', '3', '4'] }
  ];

  return (
    <ul className='py-4'>
      {tree.map(({ label, component, objects }, i) => (
        <li key={i}>
          <div
            className={mx('px-2 cursor-pointer', component === main && 'bg-green-200')}
            onClick={() => handleSelect(component)}
          >
            {label}
          </div>
          {objects && (
            <ul>
              {objects.map((obj, j) => (
                <li key={j}>
                  <div
                    className={mx('flex px-2 items-center cursor-pointer')}
                    onClick={() => handleSelect(component, obj)}
                  >
                    <Circle
                      weight={obj === object ? 'fill' : undefined}
                      className={mx('mr-2 text-blue-500', getSize(3))}
                    />
                    Object {obj}
                  </div>
                </li>
              ))}
            </ul>
          )}
>>>>>>> 6076c428c66cd819ac1dc39035e3c0b96592cf5e
        </li>
      ))}
    </ul>
  );
};

<<<<<<< HEAD
=======
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

>>>>>>> 6076c428c66cd819ac1dc39035e3c0b96592cf5e
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
<<<<<<< HEAD
// Stories
//

const PanelMain: FC<{ children: ReactNode }> = ({ children }) => {
=======
// Layout
//

const PanelSidebarContent: FC<{ children: ReactNode }> = ({ children }) => {
>>>>>>> 6076c428c66cd819ac1dc39035e3c0b96592cf5e
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
<<<<<<< HEAD
  const { main } = useParams();
=======
  // Decouple router.
  const { controller } = useContext(SurfaceControllerContext);
  const { main } = useParams();
  useEffect(() => {
    controller.setState('debug', 'debug');
    controller.setState('sidebar', 'navigator');
    controller.setState('main', main);
  }, [main]);
>>>>>>> 6076c428c66cd819ac1dc39035e3c0b96592cf5e

  return (
    <PanelSidebarProvider
      inlineStart
      slots={{
        main: { className: 'flex grow overflow-hidden' },
        content: {
<<<<<<< HEAD
          children: <Surface id='sidebar' element={<SidebarSurface />} component='navigator' />
        }
      }}
    >
      <PanelMain>
        <Surface id='main' element={<MainSurface />} component={main} />
        <Surface id='debug' component='debug' />
      </PanelMain>
=======
          children: <Surface id='sidebar' element={<SidebarSurface />} />
        }
      }}
    >
      <PanelSidebarContent>
        <Surface id='main' element={<MainSurface />} />
        <Surface id='debug' />
      </PanelSidebarContent>
>>>>>>> 6076c428c66cd819ac1dc39035e3c0b96592cf5e
    </PanelSidebarProvider>
  );
};

const TestApp = () => {
<<<<<<< HEAD
  // TODO(burdon): Surfaces defined by plugins.
  // prettier-ignore
  const components = {
=======
  // TODO(burdon): Components defined by plugins.
  // prettier-ignore
  const components = {
    'debug': Debug,
>>>>>>> 6076c428c66cd819ac1dc39035e3c0b96592cf5e
    'navigator': Navigator,
    'component-1': Component1,
    'component-2': Component2,
    'component-3': Component3
  };

  const Root = () => (
<<<<<<< HEAD
    <ThemeProvider appNs='kai' rootDensity='fine' resourceExtensions={[appkitTranslations, osTranslations]}>
      <SurfaceManagerContextProvider components={components}>
        <Layout />
      </SurfaceManagerContextProvider>
=======
    <ThemeProvider appNs='kai' rootDensity='fine' resourceExtensions={[osTranslations, appkitTranslations]}>
      <SurfaceControllerContextProvider components={components}>
        <Layout />
      </SurfaceControllerContextProvider>
>>>>>>> 6076c428c66cd819ac1dc39035e3c0b96592cf5e
    </ThemeProvider>
  );

  const router = createMemoryRouter([
    {
      path: '/',
      element: <Root />,
      children: [
        {
          path: '/:main',
          element: <Root />,
          children: [
            {
              path: '/:main/:object',
              element: <Root />
            }
          ]
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
