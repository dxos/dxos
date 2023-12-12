//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { Circle, List, MagnifyingGlass, CaretLeft, CaretRight } from '@phosphor-icons/react';
import React, { type FC, type ReactNode, Suspense, useContext, useEffect, useState } from 'react';
import { createMemoryRouter, RouterProvider, useLocation, useNavigate, useParams } from 'react-router-dom';

import { Event } from '@dxos/async';
import { raise } from '@dxos/debug';
import { FullscreenDecorator } from '@dxos/kai-frames';
import { appkitTranslations, Input } from '@dxos/react-appkit';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';
import { osTranslations } from '@dxos/react-shell';
import { Button, Main, ThemeProvider, useSidebars } from '@dxos/react-ui';
import { getSize, mx, defaultTx } from '@dxos/react-ui-theme';

// type Action = {
//   type: 'select';
//   source: string;
// };

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
  controller: new SurfaceController(),
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

const SIDEBAR_SURFACE_NAME = 'KaiFrameworkSidebarSurface';

const SidebarSurface = () => {
  const { toggleNavigationSidebar } = useSidebars(SIDEBAR_SURFACE_NAME);
  const { controller } = useContext(SurfaceControllerContext);

  return (
    <div className='flex flex-col grow bs-full bg-zinc-200'>
      <div className='flex justify-between h-[32px] px-2 items-center'>
        <div className='flex'>
          <Button variant='ghost' onClick={() => controller.setState('sidebar', 'navigator')}>
            <List className={getSize(5)} />
          </Button>
          <Button variant='ghost' onClick={() => controller.setState('sidebar', 'search')}>
            <MagnifyingGlass className={getSize(5)} />
          </Button>
        </div>
        <div>
          <Button variant='ghost' onClick={toggleNavigationSidebar}>
            <CaretLeft className={getSize(5)} />
          </Button>
        </div>
      </div>

      <SurfaceOutlet />
      <Info />
    </div>
  );
};

SidebarSurface.displayName = SIDEBAR_SURFACE_NAME;

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
  const { main, object } = useParams();
  const handleSelect = (component: string | undefined, objectId?: string) => {
    navigate(`/${component ?? ''}` + (objectId ? `/${objectId}` : ''));
  };

  const tree = [
    { label: 'Reset' },
    { label: 'Component 1', component: 'component-1' },
    { label: 'Component 2', component: 'component-2', objects: ['1'] },
    { label: 'Component 3', component: 'component-3', objects: ['2', '3', '4'] },
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
          input: { className: 'w-full', autoFocus: true, spellCheck: false },
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

const PANEL_SIDEBAR_CONTENT_NAME = 'PanelSidebarContent';

const PanelSidebarContent: FC<{ children: ReactNode }> = ({ children }) => {
  const { navigationSidebarOpen, openNavigationSidebar } = useSidebars(PANEL_SIDEBAR_CONTENT_NAME);
  return (
    <div className='flex grow overflow-hidden'>
      {!navigationSidebarOpen && (
        <div className='flex flex-col h-full px-2'>
          <div className='flex h-[32px] items-center'>
            <Button variant='ghost' onClick={openNavigationSidebar}>
              <CaretRight className={getSize(5)} />
            </Button>
          </div>
        </div>
      )}
      <div className='flex flex-col grow overflow-hidden divide-y divide-zinc-300'>{children}</div>
    </div>
  );
};

PanelSidebarContent.displayName = PANEL_SIDEBAR_CONTENT_NAME;

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
    <Main.Root>
      <Main.Overlay />
      <Main.NavigationSidebar>
        <Surface id='sidebar' element={<SidebarSurface />} />
      </Main.NavigationSidebar>
      <Main.Content>
        <PanelSidebarContent>
          <Surface id='main' element={<MainSurface />} />
          <Surface id='debug' />
        </PanelSidebarContent>
      </Main.Content>
    </Main.Root>
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
    <ThemeProvider
      appNs='kai'
      rootDensity='fine'
      resourceExtensions={[osTranslations, appkitTranslations]}
      tx={defaultTx}
    >
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
          element: <Root />,
          children: [
            {
              path: '/:main/:object',
              element: <Root />,
            },
          ],
        },
      ],
    },
  ]);

  return <RouterProvider router={router} />;
};

export default {
  component: Surface,
  decorators: [FullscreenDecorator(), ClientSpaceDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  render: () => <TestApp />,
};
