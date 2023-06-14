//
// Copyright 2023 DXOS.org
//

import React, { useEffect } from 'react';
import { Outlet, Params, RouteObject, useLocation, useNavigate, useParams, useRoutes } from 'react-router';
import { BrowserRouter } from 'react-router-dom';

import { observer } from '@dxos/observable-object/react';

import { definePlugin, Plugin, usePluginContext } from '../framework';
import { selectedToUri, useTreeView } from './TreeViewPlugin';

export type RouterPluginProvides = {
  router: {
    routes: () => RouteObject[];
    current?: (params: Params<string>) => string[] | null;
    next?: (path: string, params: Params<string>) => string[] | null;
  };
};

export type RouterPlugin = Plugin<RouterPluginProvides>;

const routerPlugins = (plugins: Plugin[]): RouterPlugin[] => {
  return (plugins as RouterPlugin[]).filter((p) => p.provides?.router);
};

const Root = observer(({ plugins }: { plugins: RouterPlugin[] }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const treeView = useTreeView();

  useEffect(() => {
    const [current] = plugins
      .map((plugin) => plugin.provides.router.current?.(params))
      .filter((current): current is string[] => Boolean(current));

    if (!current && treeView.selected.length === 0) {
      return;
    }

    if (!current || selectedToUri(current) !== selectedToUri(treeView.selected)) {
      navigate(selectedToUri(treeView.selected));
    }
  }, [treeView.selected]);

  useEffect(() => {
    const [current] = plugins
      .map((plugin) => plugin.provides.router.next?.(location.pathname, params))
      .filter((current): current is string[] => Boolean(current));

    if (current && selectedToUri(current) !== selectedToUri(treeView.selected)) {
      treeView.selected = current;
    }
  }, [location.pathname, params]);

  return <Outlet />;
});

export const RoutesPlugin = definePlugin({
  meta: {
    id: 'dxos:routes',
  },
  provides: {
    // TODO(wittjosiah): Should be BrowserRouter.
    context: ({ children }) => <BrowserRouter>{children}</BrowserRouter>,
    components: {
      default: () => {
        const pluginContext = usePluginContext();
        const plugins = routerPlugins(pluginContext.plugins);
        const routes = plugins.map((plugin) => plugin.provides.router.routes?.() ?? []).flat();
        return useRoutes([
          {
            path: '/',
            element: <Root plugins={plugins} />,
            children: routes,
          },
        ]);
      },
    },
  },
});
