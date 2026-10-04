---
title: Build a Plugin with the Assistant
description: Have Composer's assistant write, build and load a plugin for you, in the desktop app
sidebar:
  order: 4
---

The Composer desktop app can build a plugin for you. You start a project from a template, hand its tasks to
the assistant, and a few minutes later you load the result: **World Clock**, a page with a world map and a row
of live clocks.

You need the Composer desktop app for macOS, signed in. Nothing else: the assistant builds in a sandbox with its
own tools.

## 1. Turn on Sandbox

Open **Plugins** in the sidebar, search for **Sandbox**, and switch it on.

## 2. Create the project

1. In a space, click **+**, choose **Project**, and pick the **Composer Plugin** template.
2. Name it **World Clock** and click **Create**.

The project's **Tasks** tab holds one task, **Build the World Clock plugin**, with four steps under it.

## 3. Hand it to the assistant

1. On the **Tasks** tab, tick **Build the World Clock plugin** and click **Assign selected tasks to agent**.
2. Open the **Assistant** tab beside the project to watch it work.

It ticks off the steps as it goes, which takes 10 to 25 minutes.

## 4. Load the plugin

1. When the chat shows **Load plugin**, click it.
2. Open **Plugins**, then **Labs**, and switch **World Clock** on.

## 5. Use it

Click **Clocks** under the new **WORLD CLOCK** group in your space. Add clocks with the **+** card; click one to
find it on the map.

## What the assistant can touch

The build runs in a sandbox on your computer, which you can see in your space as **World Clock**:

- It can write only its own folder, and cannot read the rest of your home folder.
- It can reach only package registries and GitHub, where it gets the plugin guide and the packages.
- It builds with Bun, which ships inside Composer, so you install nothing.

Loading the plugin is always your click: the assistant only offers it.

## Clean up

Delete the **World Clock** project and the **World Clock** sandbox from your space (right-click, **Delete**),
and uninstall the plugin from **Plugins → Labs**.

## If something goes wrong

- **No Composer Plugin template**: it is offered in the desktop app only. Update Composer if you don't see it.
- **The chat stops before Load plugin**: ask it to carry on with the next unfinished task.
- **Load plugin fails**: the sandbox serves the plugin only while Composer runs. Ask the assistant to publish
  it again.
