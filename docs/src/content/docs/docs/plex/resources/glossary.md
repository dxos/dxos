---
title: Glossary
description: Every Composer and PLEX term, defined once.
---

ECHO terms, such as space and object, are in ECHO's [glossary](/docs/additional-resources/glossary/). Identity and
invitation terms are in HALO's [glossary](/docs/halo/resources/glossary/).

### Action

An action is a [node](#node) in [App Graph](#app-graph) that stands for something a person can do to another node.
Its data is a function that returns an Effect. Its [disposition](#disposition) says where it appears. See
[App Graph](/docs/plex/guides/app-graph/).

### Activation event

An activation event is a named moment in an app's life, such as startup or the first time a view is needed. A
[module](#module) names the event it waits for, and the [plugin manager](#plugin-manager) loads the module when the
event fires. See [Activation](/docs/plex/concepts/activation/).

### Annotation

An annotation is metadata on an ECHO schema that tells the app how to present its objects. For example, an annotation
says which property is the label, what the type's icon is, or whether people create it themselves. The
[ECHO](/docs/plex/guides/using-echo/) guide lists the annotations the app reads.

### App Graph

App Graph is the graph of everything a person can open or do in an app, made of [nodes](#node) and
[actions](#action). In Composer, the navigation tree, toolbars, context menus and command palette all read it. See
[App Graph](/docs/plex/guides/app-graph/).

### App Toolkit

App Toolkit is `@dxos/app-toolkit`, the package that adds what a workspace app needs on top of the framework:
[App Graph](#app-graph), layout, settings and the standard [roles](#role). See
[App capabilities](/docs/plex/guides/app-capabilities/).

### Assistant

The assistant is the AI agent built into Composer, which a person talks to in a chat. It runs a plugin's
[operations](#operation) as tools when a [skill](#skill) offers them. See
[Operations](/docs/plex/concepts/operations/).

### Atom

An atom is a reactive value from Effect's [atom library](https://www.npmjs.com/package/@effect/atom-react). Code
reads its current value or subscribes to its changes, and a component that reads one re-renders when it changes. A
plugin's settings and the app's layout are atoms.

### Builder extension

A builder extension is a matcher and a connector that add [nodes](#node) to [App Graph](#app-graph). The matcher
picks the nodes it applies to, and the connector returns the nodes to connect to them. See
[App Graph](/docs/plex/guides/app-graph/).

### Capability

A capability is a typed slot that [modules](#module) contribute values to and other modules read. Plugins extend each
other through capabilities instead of imports. See [Capabilities](/docs/plex/concepts/capabilities/).

### Contribution

A contribution is one value that a [module](#module) puts into a [capability](#capability), such as a surface, a
handler set or a list of types. A module's contributions are removed when the module deactivates.

### Dev plugin

A dev plugin is a plugin that Composer Preview loads from the plugin's dev server. It is never installed, and
Composer loads it again on every reload. See [Run it in Composer](/docs/plex/learn/run-in-composer/).

### Disposition

A disposition is the property of an [action](#action) that says where the action appears: `toolbar` for an object's
toolbar, or `list-item` for its menu in the navigation tree. See [App Graph](/docs/plex/guides/app-graph/).

### DXN

A DXN is the DXOS name for a resource such as a type, a plugin or an operation. It is `dxn:` followed by an
[NSID](#nsid) and an optional version, and `DXN.make` builds one. See ECHO's
[References and DXNs](/docs/echo/concepts/references/).

### Filter

A filter is the part of a [surface](#surface) contribution that names the [roles](#role) it serves and a guard on the
data. For example, a filter can say "the article role, when the subject is a Note". See
[Surfaces](/docs/plex/concepts/surfaces/).

### Handler

A handler is an Effect that takes an [operation](#operation)'s input and returns its output. Plugins contribute
handlers in a [handler set](#handler-set), separately from the operation's definition. See
[Operation](/docs/plex/guides/operation/).

### Handler set

A handler set is a group of [handlers](#handler) that a plugin contributes through the `OperationHandler` capability.
A lazy handler set loads each handler the first time its operation runs. See
[Operation](/docs/plex/guides/operation/).

### Host

A host is the code that renders a [surface](#surface). It names a [role](#role), passes the data, and shows what
plugins contributed. The app's layout is a host, and so is any component that renders `Surface.Surface`. See
[Surfaces](/docs/plex/concepts/surfaces/).

### Inspector

The inspector is a small PLEX app in these docs that loads one plugin and shows each of its modules working. See
[Debugging](/docs/plex/guides/debugging/).

### Manifest

A manifest is the `manifest.json` file that describes a plugin to the app that loads it. It holds the plugin's
metadata and says where its code is. The plugin's dev server serves one and its build writes one, both made from
`dx.config.ts`. Composer and the [inspector](#inspector) load a plugin from its manifest's URL.

### Module

A module is a part of a [plugin](#plugin) that activates on an [activation event](#activation-event) and contributes
to [capabilities](#capability). See [Plugins and modules](/docs/plex/concepts/plugins/).

### Module maker

A module maker is a function, such as `AppCapability.surface`, that makes a [module](#module) for one
[capability](#capability). It fixes the capability and the activation event, so `dx.config.ts` names only the file to
load. See [App capabilities](/docs/plex/guides/app-capabilities/).

### Node

A node is an item in [App Graph](#app-graph), with an id, a type, data and properties. Its data is usually what it
stands for, such as a space or an ECHO object. Each node has a path of ids from the root, and in Composer the URL is
a node path. See [App Graph](/docs/plex/guides/app-graph/).

### NSID

An NSID is a reverse-domain name with dots between its segments, such as `com.example.plugin.stash`. Its last segment
is camelCase. An NSID names a plugin, a capability or an activation event, and a [DXN](#dxn) is built from one.

### Operation

An operation is a named action with a typed input and output. You define it once, and buttons, the command palette
and the [assistant](#assistant) all run it. See [Operations](/docs/plex/concepts/operations/).

### Operation invoker

The operation invoker is the part of the framework that runs an [operation](#operation). It looks up the
[handler](#handler) by the operation's key, validates the input and output, and runs the handler.

### Plugin

A plugin is metadata and the [modules](#module) it is made of. A plugin does nothing by itself. Its modules
contribute everything it adds to the app. See [Plugins and modules](/docs/plex/concepts/plugins/).

### Plugin manager

The plugin manager is the part of the framework that loads [plugins](#plugin), fires
[activation events](#activation-event) and activates the [modules](#module) waiting on them. See
[PluginManager](/docs/plex/guides/plugin-manager/).

### Private registry

A private registry is the list of plugins that DXOS hosts for one identity. Composer lists them only to that
identity. See [Publishing a plugin](/docs/plex/publishing-plugins/).

### Role

A role is the name of a place in an app's UI, such as `Article` for the main content area or `Section` for an object
inside a stack. It is a typed token. The [host](#host) renders a [surface](#surface) with it, and a
[filter](#filter) matches it. Each role declares the data the host passes with it. See
[Surfaces](/docs/plex/concepts/surfaces/).

### Schema registration

A schema registration is a plugin's contribution to the `Schema` capability, which lists the ECHO types it defines.
The app can create, name and list only objects of registered types. The [ECHO](/docs/plex/guides/using-echo/) guide
shows how to register a type.

### Skill

A skill is a name, instructions and a list of [operations](#operation) that become the [assistant](#assistant)'s
tools. A plugin contributes one through `AppCapabilities.SkillDefinition`. See
[Operations](/docs/plex/concepts/operations/).

### Surface

A surface is a named place in the UI that plugins fill with components. A surface contribution is a component and a
[filter](#filter). The [host](#host) asks for a [role](#role) and renders the contributions that match. See
[Surfaces](/docs/plex/concepts/surfaces/).

### Tag

A tag is the value in code that names a [capability](#capability). It is an [NSID](#nsid) plus the TypeScript type of
the capability's values, and `Capability.make` and `Capability.makeSingleton` return one. The `tags` field of a
plugin's metadata is a different thing, a list of labels such as `labs` that the registry groups plugins by. See
[Capability](/docs/plex/guides/capability/).
