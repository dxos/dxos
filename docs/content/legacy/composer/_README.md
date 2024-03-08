---
breadcrumb: false
---

# Composer

What if software had a different shape? What if things that were difficult or impossible were instead trivial? What if operating systems provided a different set of primitives that shaped our usage?

**Composer is an interoperable, malleable, multiplayer, local-first software environment that flips several key assumptions of modern software.**

First, apps running inside Composer, called plugins, are interoperable. Rather than each plugin writing to it's own siloed data store, plugins write to a single unified data store owned by the user.

Second, everything inside Composer is composed of plugins that can be customized by the end-user. Composer comes pre-configured with a set of plugins for navigation, organization, window management, drag-and-drop, but all of these plugins are optional. Extending and customizing Composer with custom plugins is both powerful and simple.

Third, Composer is multiplayer by default. Sharing personal data with other users and collaborating with other users in real-time are environmental primitives that all plugins have access to.

And finally, Composer stores all user data locally, enabling plugins to work both online and offline.

::: tip Work in Progress
This document describes a system, Composer, under active design and development. Some sections describe functionality that currently exists, other sections describe future functionality and as a design document for that functionality. The document will be updated as the system evolves.
:::

**Table of Contents**
[[toc]]

# Technology Preview

Composer is currently in a technology preview phase. This means that Composer is not yet ready for production use, but we are actively seeking feedback from developers and users to help shape the future of the platform. We are also actively developing the platform, and we expect to make breaking changes to the platform as we iterate on the design and implementation.

Prior to version 1.0, breaking changes will be denoted by a minor version bump (0.3.x to 0.4, for example.) When we ship a breaking change release, we will provide a migration guide to help users and developers update their applications to the new version.

# Use Cases

(probably simpler to just show a demo video, if we can put one together)

Before we dig into how Composer works, lets consider a few concrete use cases that Composer enables.

- Composer allows work to evolve seamlessly across the life of a project
  - chat
  - document
  - GitHub Issue
  - organize those issues into a list
- Composer enables plugins to embed within one another

# How does Composer work?

## The DXOS Platform

Composer is built atop DXOS, a software development platform that powers Composer's local-first, shared data substrate, and multiplayer capabilities. A full description of DXOS can be read in [the DXOS docs](https://docs.dxos.org), but for the sake of understanding Composer, there are a few key features to understand:

**Data is stored locally on-device.** When reading and writing data the data is written to a local data store called ECHO which runs on the device. ECHO is available while offline, which speeds up reads and writes, and simplifies the user interface by removing the need for optimistic UI updates.

**Data gets replicated across user's devices automatically.** The user can join multiple devices into a single profile, called a HALO, and the user's data will be transparently replicated across all of those devices.

**Data is encrypted in transit with a user's encryption keys.** When data is being transmitted among their devices, it's encrypted with their keys. Data is transmitted peer-to-peer using WebRTC, though we are [evaluating alternate transport mechanisms and network topologies]().

**Data can be shared with other users.** Data can also be shared among users via a primitive called Spaces. A Space is similar to a shared folder: everything in the folder will be shared with read and write privileges with every other user who has access to the Space.

**Users have a single data store that applications write to and read from.** Applications read and write to a single ECHO database owned by the app's user. Applications can read and write each other's data, enabling trivial interoperability.

**Data is synchronized using CRDTs to resolve conflicts.** The ECHO database uses CRDTs to automatically reconcile writes to the database, ensuring that offline writers and multiple users don't clobber each other's data. In most cases, ECHO's built-in CRDT primitives are sufficient for an application's use cases, but custom merging behavior is also possible.

**Users can choose to run a DXOS Agent on a server for additional services.** An optional server-powered [DXOS Agent]() provides persistent replication, offsite backup, off-device compute, and other services and resources.

For a more thorough overview of the DXOS platform, along with documentation about the SDKs, please consult the DXOS docs.

## The Composer Environment: Plugins, Surfaces, Intents

Composer extends the DXOS platform with a few concepts designed to provide interoperability and malleability.

### Plugins

All functionality in Composer is provided in the form of plugins, including the Composer user interface, navigation elements, views of the various types of data, everything. Plugins can be roughly divided into a few categories, though this taxonomy is not formalized.

**User Interface plugins.** User interface plugins build up the Composer user interface, from the NavTree left sidebar to the right sidebar to the main area. They also provide styles for UI elements and a set of core UI primitives that can be utilized by other plugins.

**Data integration plugins.** Data integration plugins enable Composer to interact with a variety of data sources, including the local ECHO data store and the local file system and also external data sources like IPFS or GitHub.

**Presentation plugins.** Presentation plugins present a view for data objects that allows users to interact with the data in a variety of ways; view, modify, organize, search, browse, etc. Most plugins will be Presentation plugins, as they extend the types of objects that Composer is capable of interacting with.

::: note Rename Presentation plugins to View plugins?
:::

For more details about the specifics of plugin capabilities, see [Anatomy of a Plugin]().

### Surfaces

Plugins can expose surfaces that enable other plugins to draw on them. This enables plugins to nest their views within each other and plugins to provide extension visual points for other plugins without explicitly defining which plugins render. For example, the `Layout` plugin creates a left sidebar surface along with a main surface and an optional right sidebar surface. Any plugin can render content in those surfaces. The `NavTree` plugin renders a Navigation Tree view in the left sidebar surface.

Similarly, the Stack plugin presents a collection of objects as a vertically-scrollable list, exposing a surface called a section that other plugins can use to render an object into the stack. In this way, Stack doesn't have any knowledge of different types of objects, but only creates a vertical list view with the various list controls.

Surfaces are an extension of the Inversion of Control pattern that is found throughout the Composer architecture.

### Intents

TBD

# The Composer Interface

This section describes the user interface for Composer.

## ReactUI

the DXOS react UI framework

## The NavTree

- Spaces
  - Personal
  - Shared
- Nodes - add an item to the navtree
- Drag-n-drop
- Folders?

## The Main Surface

Main area to render a thing

## Shell

Discuss identity, device joins, etcs

## Complimentary Sidebar

- Search
- Threads
- How we recommend using it

## Mosaic

data-bound controls

## Stacks

### What is a stack

A stack is a novel interface for users to navigate, organize, and manipulate items of a variety of "data types" in a unified manner. Concretely, a stack is a visual presentation of an ordered list of items that can be navigated by scrolling up and down, where each item is visually represented by a card roughly the size and shape of a 3x5 index card.

..stack diagram..

### Why we need a stack

The DXOS model upends a key relationship between applications and data: rather than each application having a separate silo of data, there is a single shared substrate of data that multiple applications interact with.

How does upending this relationship change the Composer environment?

- **Many diverse types of data coexist.** Multiple applications read and write to the same data store, leading to a variety of items of various types and media: documents, images, whiteboards, table rows, person records, etc.
- **Apps are always running.** Within Composer, applications can be thought of as all "running" simultaneously. There's no need to "open" or "quit" an application. There's no longer a need to differentiate between the modes of "view" and "edit."
- **Items don't have an inherent location.** Items do not live at a specific location in a file system construct as files do, but rather in a database. Thus they can be visible in multiple places in the interface at the same time. (This concept is sometimes called transclusion.)

This reversal creates a need for new user interfaces that are not predicated on an app silo model. We need new UI paradigms. Specifically, we need a way of navigating, organizing, and manipulating items that takes seriously:

- Transclusion over location
- Visualize multiple data types
- Apps as always-available views into data

### Prior Art

In an application-centric world, there have been various solutions to this general problem.

- The Desktop Interface: the desktop, folders, overlapping windows
- macOS Finder Views
  - List
  - Grid
  - Columns
  - Quick Look
- Block-based editors
- On mobile, the ubiquity of UITableView on iOS
  - scroll up and down
  - pull-to-refresh
  - swipe left and right on items

### Data Structure

Given any collection (ordered list or unordered) of items, that collection can be visualized as a stack. A stack presents an ordering of the collection:

- manual sort order (stored in the list itself if ordered?)
- currently active sort order (manual or automatic)
- hidden item IDs
- active view mode

### Stack Affordances

The UX affordances necessary for a stack to function are as follows:

- Add item to stack
- Remove item from stack
- Re-order stack (manual sort order)
- Edit item (depending on the preferences)
- Sort stack automatically
  - most/least recently updated
  - most/least recently created
  - by kind
  - by name
  - by size?
- Navigate to the stack item
- Drag item from any other view into the stack
- Navigate up and down via keyboard

Possible extensions of stack functionality:

- Hide or archive item
  - the ability to leave something in the list but mark it as "dealt with" - archived or hidden
- Delete item completely
- Context action items based on item type
- Collapse to list view (just headers of the cards)
- Expand item to full height (but not navigate to the item)
- Items must be able to customize their own appearance
- Switch between different views (plugins) for any item
  - view a markdown doc as a doc or as a slide
- Publish stack as web page
  - this is probably a _different_ plugin actually, just like Presenter is a different plugin

### Stack use cases

How might we use a stack to accomplish a variety of user objectives?

#### Browsing a diverse set of items

Spaces within Composer can contain a variety of different item types. A stack can be used to visualize the items within a space and allow for them to be quickly navigated to, edited, and/or sorted.

#### Queue of items to work through (inbox)

- Rather than having a custom "email" plugin, a stack could be used to sort through and deal with emails
- Favorited tweets automatically sent to a List, work through as a Stack

#### Slide deck editor

- Don't need a full "slide editor" - stack primitives give you most of what you need

#### Curating a collection of related items - Pinterest

- Collect multiple items into a stack
- View the stack in masonry mode

#### Notification queue

- Rather than build a custom "notifications" feature in Composer, it can be built simply from the existing stack primitives - no special feature needed
- Notifications plugin would handle the presentation, but stack would handle the list manipulation

### Open Questions for Stack

- What about mobile?
  - Just like we don't use Finder metaphors on mobile (iOS metaphors instead), this interface is meant for Desktops (keyboard and mouse/trackpad, wider screen, etc)
  - Reduce things to Cards - different affordances
- How do we make it more composable with other DXOS primitives?

# Anatomy of a Plugin

documentation on how to build a plugin

# Plugin Library

Information about current plugins could go here

# Additional Topics

- Data Migrations
- PWA
- Native
- Types/schemas
