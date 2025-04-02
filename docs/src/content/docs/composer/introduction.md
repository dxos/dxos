---
title: Introduction
description: Getting started with DXOS
---

Composer is build with extensibility at its core. Everything within the application is built using the same App Framework APIs, from the UI down to data and business logic, anything in Composer can be customized and enhanced.

## Anatomy of a Plugin

A [`Plugin`](/typedoc/app-framework/classes/Plugin.html) consists of one or more [plugin modules](#pluginmodule), which are activated by [activation events](#activationevent) and contribute [capabilities](#capability).

### `PluginModule`

A [`PluginModule`](/typedoc/app-framework/classes/PluginModule.html) is a unit of containment of modular functionality that can be provided to an application.
Activation of a module is async allowing for code to split and loaded lazily.
The [`activate`](/typedoc/app-framework/classes/PluginModule.html#activate) function of module takes the [plugins context](#pluginscontext) as its only argument.
In addition to the event which activates the module, events can be fired before and after the activation of a module.
This allows modules to ensure certain dependencies are activated prior to their own activation based on the graph of activation events.

### `ActivationEvent`

An [`ActivationEvent`](/typedoc/app-framework/types/ActivationEvent.html) is a unique string identifier representing an event.
This is expected to be a URI, where initial parts are often the id of the plugin whose package defines the event.
The framework defines some [common activation events](/typedoc/app-framework/modules/Events.html), however plugins are free to define their own as well.

### `Capability`

A [`Capability`]() is a unique string identifier with a Typescript type associated with it.
When a capability is contributed to the application an implementation of the interface is provided.
Many of the same capability can be contributed to the application and when they are requested all will be returned.
The framework defines some [common capabilities](/typedoc/app-framework/modules/Capabilities.html), however plugins are free to define their own as well.

### `PluginsContext`

The [`PluginsContext`](/typedoc/app-framework/classes/PluginsContext.html) facilitates the dependency injection between [plugin modules](#pluginmodule) by allowing them contribute and request capabilities from each other.
It tracks the capabilities that are contributed in an in-memory live object.
This allows the application to subscribe to this state and incorporate plugins which are added dynamically.
