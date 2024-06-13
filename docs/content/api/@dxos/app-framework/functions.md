---
title: Functions
---
# Functions
### [lazy(p, \[props\])](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/PluginHost/plugin.ts#L117)




Returns: <code>function</code>

Arguments: 

`p`: <code>LazyPlugin&lt;T&gt;</code>

`props`: <code>T</code>


### [IntentProvider(props)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/IntentPlugin/IntentContext.tsx#L49)


**NOTE**: Exotic components are not callable.

Returns: <code>"null" | ReactElement&lt;any, string | JSXElementConstructor&lt;any&gt;&gt;</code>

Arguments: 

`props`: <code>ProviderProps&lt;[IntentContext](/api/@dxos/app-framework/types/IntentContext)&gt;</code>


### [PluginHost(options)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/PluginHost/PluginHost.tsx#L35)


Bootstraps an application by initializing plugins and rendering root components.

Returns: <code>[PluginDefinition](/api/@dxos/app-framework/types/PluginDefinition)&lt;[PluginHostProvides](/api/@dxos/app-framework/types/PluginHostProvides)&gt;</code>

Arguments: 

`options`: <code>[BootstrapPluginsParams](/api/@dxos/app-framework/types/BootstrapPluginsParams)</code>


### [PluginProvider(props)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/PluginHost/PluginContext.tsx#L67)


**NOTE**: Exotic components are not callable.

Returns: <code>"null" | ReactElement&lt;any, string | JSXElementConstructor&lt;any&gt;&gt;</code>

Arguments: 

`props`: <code>ProviderProps&lt;[PluginContext](/api/@dxos/app-framework/types/PluginContext)&gt;</code>


### [Surface(props)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/SurfacePlugin/Surface.tsx#L84)


A surface is a named region of the screen that can be populated by plugins.

Returns: <code>"null" | ReactElement&lt;any, string | JSXElementConstructor&lt;any&gt;&gt;</code>

Arguments: 

`props`: <code>Pick&lt;[SurfaceProps](/api/@dxos/app-framework/types/SurfaceProps), string | number&gt; & RefAttributes&lt;HTMLElement&gt;</code>


### [SurfaceProvider(props)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/SurfacePlugin/SurfaceRootContext.tsx#L44)


**NOTE**: Exotic components are not callable.

Returns: <code>"null" | ReactElement&lt;any, string | JSXElementConstructor&lt;any&gt;&gt;</code>

Arguments: 

`props`: <code>ProviderProps&lt;[SurfaceRootContext](/api/@dxos/app-framework/types/SurfaceRootContext)&gt;</code>


### [activeIds(active)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/common/navigation.ts#L63)




Returns: <code>Set&lt;string&gt;</code>

Arguments: 

`active`: <code>undefined | string | Record&lt;string, string | string[]&gt;</code>


### [createApp(options)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/App.tsx#L39)


Expected usage is for this to be the entrypoint of the application.
Initializes plugins and renders the root components.

Returns: <code>function</code>

Arguments: 

`options`: <code>[BootstrapPluginsParams](/api/@dxos/app-framework/types/BootstrapPluginsParams)</code>


### [definePlugin(plugin)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/helpers.ts#L12)


Define a plugin

Returns: <code>[Plugin](/api/@dxos/app-framework/types/Plugin)&lt;TProvides&gt;</code>

Arguments: 

`plugin`: <code>[Plugin](/api/@dxos/app-framework/types/Plugin)&lt;TProvides&gt;</code>


### [filterPlugins(plugins, predicate)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/helpers.ts#L33)


Filter a list of plugins to only those that match a predicate.

Returns: <code>[Plugin](/api/@dxos/app-framework/types/Plugin)&lt;T&gt;[]</code>

Arguments: 

`plugins`: <code>[Plugin](/api/@dxos/app-framework/types/Plugin)[]</code>

`predicate`: <code>function</code>


### [findPlugin(plugins, id)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/helpers.ts#L17)


Find a plugin by ID.

Returns: <code>undefined | [Plugin](/api/@dxos/app-framework/types/Plugin)&lt;T&gt;</code>

Arguments: 

`plugins`: <code>[Plugin](/api/@dxos/app-framework/types/Plugin)[]</code>

`id`: <code>string</code>


### [firstMainId(active)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/common/navigation.ts#L60)




Returns: <code>string</code>

Arguments: 

`active`: <code>undefined | string | Record&lt;string, string | string[]&gt;</code>


### [getPlugin(plugins, id)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/helpers.ts#L26)


Find a plugin by ID, or raise an error if not found.

Returns: <code>[Plugin](/api/@dxos/app-framework/types/Plugin)&lt;T&gt;</code>

Arguments: 

`plugins`: <code>[Plugin](/api/@dxos/app-framework/types/Plugin)[]</code>

`id`: <code>string</code>


### [initializePlugin(pluginDefinition)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/PluginHost/PluginHost.tsx#L163)


Resolve a  `PluginDefinition`  into a fully initialized  `Plugin` .

Returns: <code>Promise&lt;[Plugin](/api/@dxos/app-framework/types/Plugin)&lt;T & U&gt;&gt;</code>

Arguments: 

`pluginDefinition`: <code>[PluginDefinition](/api/@dxos/app-framework/types/PluginDefinition)&lt;T, U&gt;</code>


### [isActiveParts(active)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/common/navigation.ts#L54)




Returns: <code>active is Record&lt;string, string | string[]&gt;</code>

Arguments: 

`active`: <code>undefined | string | Record&lt;string, string | string[]&gt;</code>


### [isAdjustTransaction(data)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/common/navigation.ts#L57)




Returns: <code>data is [NavigationAdjustment](/api/@dxos/app-framework/types/NavigationAdjustment)</code>

Arguments: 

`data`: <code>undefined | [IntentData](/api/@dxos/app-framework/types/IntentData)</code>


### [isIdActive(active, id)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/common/navigation.ts#L73)




Returns: <code>boolean</code>

Arguments: 

`active`: <code>undefined | string | Record&lt;string, string | string[]&gt;</code>

`id`: <code>string</code>


### [isObject(data)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/SurfacePlugin/helpers.ts#L22)


Checks if the given data is an object and not null.

Useful inside surface component resolvers as a type guard.

Returns: <code>data is object</code>

Arguments: 

`data`: <code>unknown</code>


### [parseFileManagerPlugin(plugin)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/common/file.ts#L34)




Returns: <code>undefined | [Plugin](/api/@dxos/app-framework/types/Plugin)&lt;[FileManagerProvides](/api/@dxos/app-framework/types/FileManagerProvides)&gt;</code>

Arguments: 

`plugin`: <code>[Plugin](/api/@dxos/app-framework/types/Plugin)</code>


### [parseGraphBuilderPlugin(plugin)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/common/graph.ts#L32)


Type guard for graph builder plugins.

Returns: <code>undefined | [Plugin](/api/@dxos/app-framework/types/Plugin)&lt;[GraphBuilderProvides](/api/@dxos/app-framework/types/GraphBuilderProvides)&gt;</code>

Arguments: 

`plugin`: <code>[Plugin](/api/@dxos/app-framework/types/Plugin)</code>


### [parseGraphPlugin(plugin)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/common/graph.ts#L26)


Type guard for graph plugins.

Returns: <code>undefined | [Plugin](/api/@dxos/app-framework/types/Plugin)&lt;[GraphProvides](/api/@dxos/app-framework/types/GraphProvides)&gt;</code>

Arguments: 

`plugin`: <code>[Plugin](/api/@dxos/app-framework/types/Plugin)</code>


### [parseIntentPlugin(plugin)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/IntentPlugin/provides.ts#L19)




Returns: <code>undefined | [Plugin](/api/@dxos/app-framework/types/Plugin)&lt;[IntentPluginProvides](/api/@dxos/app-framework/types/IntentPluginProvides)&gt;</code>

Arguments: 

`plugin`: <code>[Plugin](/api/@dxos/app-framework/types/Plugin)</code>


### [parseIntentResolverPlugin(plugin)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/IntentPlugin/provides.ts#L22)




Returns: <code>undefined | [Plugin](/api/@dxos/app-framework/types/Plugin)&lt;[IntentResolverProvides](/api/@dxos/app-framework/types/IntentResolverProvides)&gt;</code>

Arguments: 

`plugin`: <code>[Plugin](/api/@dxos/app-framework/types/Plugin)</code>


### [parseLayoutPlugin(plugin)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/common/layout.ts#L79)


Type guard for layout plugins.

Returns: <code>undefined | [Plugin](/api/@dxos/app-framework/types/Plugin)&lt;[LayoutProvides](/api/@dxos/app-framework/types/LayoutProvides)&gt;</code>

Arguments: 

`plugin`: <code>[Plugin](/api/@dxos/app-framework/types/Plugin)</code>


### [parseMetadataRecordsPlugin(plugin)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/common/metadata.ts#L23)




Returns: <code>undefined | [Plugin](/api/@dxos/app-framework/types/Plugin)&lt;[MetadataRecordsProvides](/api/@dxos/app-framework/types/MetadataRecordsProvides)&gt;</code>

Arguments: 

`plugin`: <code>[Plugin](/api/@dxos/app-framework/types/Plugin)</code>


### [parseMetadataResolverPlugin(plugin)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/common/metadata.ts#L27)




Returns: <code>undefined | [Plugin](/api/@dxos/app-framework/types/Plugin)&lt;[MetadataResolverProvides](/api/@dxos/app-framework/types/MetadataResolverProvides)&gt;</code>

Arguments: 

`plugin`: <code>[Plugin](/api/@dxos/app-framework/types/Plugin)</code>


### [parseNavigationPlugin(plugin)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/common/navigation.ts#L92)


Type guard for layout plugins.

Returns: <code>undefined | [Plugin](/api/@dxos/app-framework/types/Plugin)&lt;[LocationProvides](/api/@dxos/app-framework/types/LocationProvides)&gt;</code>

Arguments: 

`plugin`: <code>[Plugin](/api/@dxos/app-framework/types/Plugin)</code>


### [parsePluginHost(plugin)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/PluginHost/PluginHost.tsx#L27)




Returns: <code>undefined | [Plugin](/api/@dxos/app-framework/types/Plugin)&lt;[PluginHostProvides](/api/@dxos/app-framework/types/PluginHostProvides)&gt;</code>

Arguments: 

`plugin`: <code>[Plugin](/api/@dxos/app-framework/types/Plugin)</code>


### [parseRootSurfacePlugin(\[plugin\])](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/SurfacePlugin/provides.ts#L21)




Returns: <code>undefined | [Plugin](/api/@dxos/app-framework/types/Plugin)&lt;[SurfacePluginProvides](/api/@dxos/app-framework/types/SurfacePluginProvides)&gt;</code>

Arguments: 

`plugin`: <code>[Plugin](/api/@dxos/app-framework/types/Plugin)</code>


### [parseSettingsPlugin(plugin)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/common/settings.ts#L15)




Returns: <code>undefined | [Plugin](/api/@dxos/app-framework/types/Plugin)&lt;[SettingsProvides](/api/@dxos/app-framework/types/SettingsProvides)&lt;Record&lt;string, any&gt;&gt;&gt;</code>

Arguments: 

`plugin`: <code>[Plugin](/api/@dxos/app-framework/types/Plugin)</code>


### [parseSurfacePlugin(\[plugin\])](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/SurfacePlugin/provides.ts#L24)




Returns: <code>undefined | [Plugin](/api/@dxos/app-framework/types/Plugin)&lt;[SurfaceProvides](/api/@dxos/app-framework/types/SurfaceProvides)&gt;</code>

Arguments: 

`plugin`: <code>[Plugin](/api/@dxos/app-framework/types/Plugin)</code>


### [parseTranslationsPlugin(plugin)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/common/translations.ts#L39)


Type guard for translation plugins.

Returns: <code>undefined | [Plugin](/api/@dxos/app-framework/types/Plugin)&lt;[TranslationsProvides](/api/@dxos/app-framework/types/TranslationsProvides)&gt;</code>

Arguments: 

`plugin`: <code>[Plugin](/api/@dxos/app-framework/types/Plugin)</code>


### [pluginMeta(meta)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/PluginHost/plugin.ts#L112)




Returns: <code>object</code>

Arguments: 

`meta`: <code>object</code>


### [resolvePlugin(plugins, predicate)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/helpers.ts#L45)


Resolves a plugin by predicate.

Returns: <code>undefined | [Plugin](/api/@dxos/app-framework/types/Plugin)&lt;T&gt;</code>

Arguments: 

`plugins`: <code>[Plugin](/api/@dxos/app-framework/types/Plugin)[]</code>

`predicate`: <code>function</code>


### [useIntent()](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/IntentPlugin/IntentContext.tsx#L35)




Returns: <code>[IntentContext](/api/@dxos/app-framework/types/IntentContext)</code>

Arguments: none




### [useIntentDispatcher()](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/IntentPlugin/IntentContext.tsx#L37)




Returns: <code>[IntentDispatcher](/api/@dxos/app-framework/types/IntentDispatcher)</code>

Arguments: none




### [useIntentResolver(plugin, resolver)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/IntentPlugin/IntentContext.tsx#L42)




Returns: <code>void</code>

Arguments: 

`plugin`: <code>string</code>

`resolver`: <code>[IntentResolver](/api/@dxos/app-framework/types/IntentResolver)</code>


### [usePlugin(id)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/PluginHost/PluginContext.tsx#L54)


Get a plugin by ID.

Returns: <code>undefined | [Plugin](/api/@dxos/app-framework/types/Plugin)&lt;T&gt;</code>

Arguments: 

`id`: <code>string</code>


### [usePlugins()](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/PluginHost/PluginContext.tsx#L49)


Get all plugins.

Returns: <code>[PluginContext](/api/@dxos/app-framework/types/PluginContext)</code>

Arguments: none




### [useResolvePlugin(predicate)](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/PluginHost/PluginContext.tsx#L62)


Resolve a plugin by predicate.

Returns: <code>undefined | [Plugin](/api/@dxos/app-framework/types/Plugin)&lt;T&gt;</code>

Arguments: 

`predicate`: <code>function</code>


### [useSurface()](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/SurfacePlugin/Surface.tsx#L105)




Returns: <code>[SurfaceProps](/api/@dxos/app-framework/types/SurfaceProps)</code>

Arguments: none




### [useSurfaceRoot()](https://github.com/dxos/dxos/blob/d7adf231c/packages/sdk/app-framework/src/plugins/SurfacePlugin/SurfaceRootContext.tsx#L42)




Returns: <code>[SurfaceRootContext](/api/@dxos/app-framework/types/SurfaceRootContext)</code>

Arguments: none




