---
title: "Introducing the Community Plugins Registry"
slug: community-plugins
date: 2026-04-24
description: "Build and publish a plugin that appears in Composer's UI — no changes to the core codebase required."
author: Josiah Witt
tags:
  - Composer
---

Composer is built plugin-first. Not "supports plugins" — built *as* plugins. The document editor is a plugin. The task manager is a plugin. The AI assistant is a plugin. Every piece of functionality in the app follows the same model: a plugin module activates, contributes capabilities, and the rest of the system responds. There's no special inner layer that the outer plugins are bolted onto.

This was a deliberate design decision from the start, and it was made with one goal in mind: we want Composer to be something the community can shape, not just something we ship.

## A proof of concept

Up until now, all of Composer's plugins have lived inside the DXOS monorepo. That was fine for getting the architecture right, but it set a ceiling on who could participate. To build a plugin you had to build it *with* us — same repo, same release cycle, same review process.

We've taken the first step to change that. The [Excalidraw plugin](https://github.com/dxos/plugin-excalidraw) has been extracted from the monorepo and published as a standalone package. It's the first DXOS plugin to live entirely outside the core codebase, built and released independently, on its own schedule.

It also serves as a reference implementation. You can look at exactly how it's structured, how it uses `@dxos/app-framework` to declare its capabilities, and how it packages its build output for distribution via a GitHub Release.

## The community plugins registry

Alongside the extracted plugin, we're launching the [DXOS Community Plugins registry](https://github.com/dxos/community-plugins).

The registry is simple by design. It's a list — a JSON file — where each entry is a pointer to a GitHub repository. Composer's plugin registry fetches this list at runtime and surfaces those plugins in the **Community** section of the UI, right alongside the **Official** plugins that ship with the app.

Getting a plugin into the registry is a pull request. You publish a GitHub Release from your own repository containing the built plugin module and a `manifest.json` describing it. Then you open a PR adding your repo to the list. A maintainer reviews and merges. That's it.

This model keeps the registry lightweight and the barrier to entry low, while still giving us a place to review what's being admitted.

## An invitation to build

If you have access to Composer and have been curious about what it takes to extend it, now is a great time to find out. The plugin model was designed so that the same APIs we use internally are available to plugin developers. If you can see it in the UI, you can swap it, extend it, or build alongside it.

The [Excalidraw plugin](https://github.com/dxos/plugin-excalidraw) is a concrete starting point. The [registry README](https://github.com/dxos/community-plugins) explains what's required to publish and submit your own. We're early — there's a lot of room to help define what a healthy plugin ecosystem looks like, and we're interested in that conversation.

## What's next

We expect the plugin model itself to keep evolving. Runtime isolation, a richer capability surface, better tooling for plugin developers — there's a lot of ground to cover. But we'd rather start now and learn from what people actually build than wait for a perfect system.

If you build something, or if you have questions about where to start, come find us on [Discord](https://dxos.org/discord). We'd love to see what you make.
