//
// Copyright 2024 DXOS.org
//

import { type Router, type RootRoute, type AnyRoute } from '@tanstack/react-router';

import { type Plugin } from '@dxos/app-framework';

export type RoutesProvides = {
  navigation: {
    routes: (plugins: Plugin[], params: { root: RootRoute; layouts: Record<string, AnyRoute> }) => AnyRoute[];
  };
};

export type LayoutRouteProvides = {
  navigation: {
    layouts: (plugins: Plugin[], params: { root: RootRoute }) => Record<string, AnyRoute>;
  };
};

export type RootRouteProvides = {
  navigation: {
    root: RootRoute;
  };
};

export type RouterProvides = {
  navigation: {
    router: Router;
  };
};

// TODO(wittjosiah): Effect Schema for parsing?

const parseRoutesExists = (plugin: Plugin) => {
  return 'navigation' in plugin.provides && plugin.provides.navigation && typeof plugin.provides.navigation === 'object'
    ? plugin.provides.navigation
    : undefined;
};

export const parseRoutesPlugin = (plugin: Plugin) => {
  const navigation = parseRoutesExists(plugin);
  return navigation && 'routes' in navigation && typeof navigation.routes === 'function'
    ? (plugin as Plugin<RoutesProvides>)
    : undefined;
};

export const parseLayoutRouteProvides = (plugin: Plugin) => {
  const navigation = parseRoutesExists(plugin);
  return navigation && 'layouts' in navigation && typeof navigation.layouts === 'function'
    ? (plugin as Plugin<LayoutRouteProvides>)
    : undefined;
};

export const parseRootRouteProvides = (plugin: Plugin) => {
  const navigation = parseRoutesExists(plugin);
  return navigation && 'root' in navigation && navigation.root ? (plugin as Plugin<RootRouteProvides>) : undefined;
};

export const parseRouterProvides = (plugin: Plugin) => {
  return 'router' in plugin.provides &&
    plugin.provides.router &&
    typeof plugin.provides.router === 'object' &&
    'routeTree' in plugin.provides.router &&
    plugin.provides.router.routeTree
    ? (plugin as Plugin<RouterProvides>)
    : undefined;
};
