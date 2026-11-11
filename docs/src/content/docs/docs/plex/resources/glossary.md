---
title: Glossary
description: Every Composer and PLEX term, defined once.
---

ECHO terms, such as space and object, are in ECHO's [glossary](/docs/additional-resources/glossary/). Identity and
invitation terms are in HALO's [glossary](/docs/halo/resources/glossary/).

### Action

A [node](#node) in the [app graph](#app-graph) that stands for something a person can do to another node. Its data is a
function that returns an Effect. The action's disposition says where it appears, such as an object's toolbar or its
context menu. See [The app graph](/docs/plex/concepts/app-graph/).

### Activation event

An event that tells the [plugin manager](#plugin-manager) when to load a [module](#module), such as startup or the
first time a view is needed. See [ActivationEvent](/docs/plex/guides/activation-event/).

### App graph

The graph of everything a person can open or do in an app, made of [nodes](#node) and [actions](#action). In Composer
the navigation tree, toolbars, context menus and command palette all read it. See
[The app graph](/docs/plex/concepts/app-graph/).

### App Toolkit

`@dxos/app-toolkit`, the package that adds what a workspace app needs on top of the framework: the
[app graph](#app-graph), layout, settings and the standard [roles](#role). See
[AppCapabilities](/docs/plex/guides/app-capabilities/).

### Builder extension

A matcher and a connector that add [nodes](#node) to the [app graph](#app-graph). The matcher picks the nodes it
applies to, and the connector returns the nodes to connect to them. See [AppGraph](/docs/plex/guides/app-graph/).

### Capability

A typed slot that [modules](#module) contribute values to and other modules read. Plugins extend each other through
capabilities instead of imports. See [Capability](/docs/plex/guides/capability/).

### Filter

The part of a [surface](#surface) contribution that names the [roles](#role) it serves and a guard on the data, such
as "the article role, when the subject is a Note". See [Surfaces](/docs/plex/concepts/surfaces/).

### Handler

An Effect that takes an [operation](#operation)'s input and returns its output. Plugins contribute handlers in a
handler set, separately from the operation's definition. See [Operation](/docs/plex/guides/operation/).

### Module

A part of a [plugin](#plugin) that loads on an [activation event](#activation-event) and contributes
[capabilities](#capability). See [Plugin](/docs/plex/guides/plugin/).

### Node

An item in the [app graph](#app-graph), with an id, a type, data and properties. Its data is usually what it stands
for, such as a space or an ECHO object. Each node has a path of ids from the root, and in Composer the URL is a node
path.

### Operation

A named action with a typed input and output, defined once and run by buttons, the command palette and agents alike.
See [Operations](/docs/plex/concepts/operations/).

### Operation invoker

The part of the framework that runs an [operation](#operation): it looks up the [handler](#handler) by the
operation's key, validates the input and output, and runs the handler.

### Plugin

Metadata and the [modules](#module) a plugin is made of. A plugin does nothing by itself; its modules contribute
everything it adds to the app. See [Plugin](/docs/plex/guides/plugin/).

### Plugin manager

The part of the framework that loads [plugins](#plugin), fires [activation events](#activation-event) and activates
the [modules](#module) waiting on them.

### Role

A named place in an app's UI, such as `Article` for the main content area or `Section` for an object inside a stack.
Each role declares the data it passes to a [surface](#surface). See [Surfaces](/docs/plex/concepts/surfaces/).

### Surface

A named place in the UI that plugins fill with components. A surface contribution is a component and a
[filter](#filter); the host asks for a [role](#role) and renders the contributions that match. See
[Surfaces](/docs/plex/concepts/surfaces/).
