---
title: "Why we're building a super-app"
slug: why-were-building-a-super-app
date: 2024-06-06
description: "Composer is an open source \"Super App\" that provides teams with a fully customizable and extensible teams in a single integrated environment."
author: Rich Burdon
tags:
  - Composer
featureImage: /blog/images/composer-hero.jpg
---

Our mission at DXOS is to help developers build privacy-preserving, self-sovereign software.

While we were building the developer platform we created multiple example apps to test and prove the underlying technologies. At some point, these efforts converged into our need to create a solid, production app with significant usage in order to prove the platform's production value.

We decided to build something we could see ourselves using every day. We're a global, remote team who make software together, and we saw a lot of room to improve the way we organize our knowledge and collaboration.

We think there is hidden value buried between the walls of all the different apps we use at work. It is somewhere in the connections between the data and the people we create it with, and we lack an environment where all of those things can come together in one place we can call home.

Our requirements were:

-   to work and collaborate in real time — or offline — in the browser, and on all our devices;
-   to have less fragmentation of knowledge locations, to have a single place to go to for all our tracking and organizing needs;
-   to remove foreign data silos and the complexity associated with juggling multiple third-party accounts;
-   to have complete control and ownership of our data;
-   to be able to easily extend the software as our needs and use cases evolve;

Above all, we wanted to lessen the fragmentation and cognitive burden associated with organizing our ideas, knowledge, and process as a team.

It also needs a great developer experience. Everyone works in different ways and all kinds of knowledge are expected to appear in the system long term. Yet another closed ecosystem will lead only to more fragmentation.

Developers already have a great, open, extensible environment found in their code editor. We don't see a similar thing being developed for everything developers and other knowledge workers do outside the IDE. ([Tell us](https://dxos.org/discord) if you're making one or are aware of one!). There are of course great apps for various kinds of productivity, and some of them are open source and extensible, but they may not solve the problem of multiplayer, or offline collaboration, or they don't run on mobile, or you have to sacrifice on privacy because it's cloud software.

Because of how central the extensibility model is to the app we want to see, it's not hard to see it as a kind of "super-app" where consistency and convenience can make it easier and faster for everyone involved to get value out of the app: both end users and plugin developers alike. Apps like WeChat and others have demonstrated tremendous success as super-apps, because they do a lot to reduce the complexity of delivering software to end users within their ecosystems.

## Meet "Composer"

Check it out at [https://dxos.org/composer](https://dxos.org/composer).

With it, you can:

-   collaborate online or offline in a peer-to-peer and privacy preserving fashion;
-   work on and organize markdown files, lists, and other kinds of media;
-   extend, bring in your data, UI components, and scenarios;

We're building with things like:

-   [vite](https://vitejs.dev/)
-   [typescript](https://www.typescriptlang.org/)
-   [react](https://reactjs.org/)
-   [tailwind](https://tailwindcss.com/)
-   [radix ui](https://radix-ui.com/)
-   [effect](https://effect.website/)
-   [automerge](https://automerge.org/)
-   [tldraw](https://github.com/tldraw/tldraw)
-   and of course, the magic peer-to-peer reactivity of DXOS.

We're choosing react for it's established learning tracks and the wide audience of developers. It's the tech our team has the most overlap with, and we look forward to the opportunity to add more framework support at a later time. Right now we want to focus on what makes our app unique.

### Everything is pluggable

Everything in the app is provided by plugins. This has been a helpful driver of clean separation of concerns. A lot of stuff we wrote in our first monolithic version of the app got neatly separated and feels much nicer to read and maintain overall. Of course it shifted our focus to a new set of problems, but that felt healthy on the whole.

We're not worried about runtime isolation yet, we feel there is plenty of space to explore in just the API surfaces required to build out all the scenarios we'd like to see. Looking forward to this, we're inspired by Figma's work on [their plugin system](https://www.figma.com/blog/how-we-built-the-figma-plugin-system/) and others like vscode for example. If you have ideas or guidance around this, we'd really welcome it - please join our [Discord](https://dxos.org/discord) and let us know!

### It's made of Surfaces

To the developer, a `<Surface />` is a generic way to "render anything" without knowing in advance how that will be done.

Got a piece of data or an object? Give it to a `<Surface />` and it will find the right UI to render it with. `Surface` asks all the plugins to provide any components which can render the given datum. This provides a great way to decouple data from presentation, and delegate presentation to the ecosystem.

The entry point of the app is one big surface, and it gets the entire state of the app as data context to look at. Components are free to nest Surfaces, the entire UI is assembled with them, and that means plugin developers can modify anything they see on the screen by swapping the relevant plugin.

### It has a sidebar for organizing

It seems safe to assume that all the knowledge we could represent in the app could be expressed as one big (lazy) graph (or tree).

Many creative tools (notion, vscode, obsidian, ...etc) are centered around documents and feature a tree-like structure in the sidebar for organizing and navigating all the content. The same `tree & detail` paradigm appears in all kinds of apps like file explorers, email clients, IDEs, chat clients, game engines, and so on. We're not sure if this is the best way to organize and navigate all the kinds of content, but it's a good place to start because this paradigm can capture the organizational needs of all the other apps we use. We are also comforted by the idea that each decision is just another separable plugin, and we hope to be able to swap or upgrade individual decisions like this once we learn more.

Plugins can participate in building up the tree of items that are represented in the sidebar. Most critically, plugins can extend each other's functionality dynamically by extending each other's tree shapes with more items or clickable actions. This enables deep multiplicative effects between plugin developers and user data. For example, it becomes easy to supply a generic file export function for all objects that can be represented as text. This can be done in an isolated plugin, and it pays dividends as other plugins bring more text-based objects into the system later.

### Towards inline malleability

At the moment, Composer is made up of plugins that are all "known at build time". This is temporary, as we iterate on the core extensibility model.

Our next step will be towards "dynamic plugins" - where anyone can load plugins from any external URL at runtime. This will enable a plugin "store" or "registry" and will make it much easier to customize the app to your specific scenario.

What we're really looking forward to is when one of those dynamic plugins will implement "inline malleability" - the ability to change the UI of the app in real time, by writing code directly inside Composer. We expect that over time, most tweaks developers will need are of the "one-liner" category, and "making it do exactly what you want" should feel like expressing an Excel formula directly inline with your work. We think this will be a great opportunity to bridge the low- and pro-code worlds, rallying them around the "personal data", "AI", and "privacy" fronts, and we can't wait to get there.

## Join the conversation

Our main goal is to make a great developer platform for self-sovereign software, because we all deserve privacy, and corporate cloud services are not the only way to deliver software. We're also taking this opportunity to reduce our cognitive load and accelerate ourselves as a remote team.

Come design this with us. We look forward to hearing from you!

Check out [Composer](https://dxos.org/composer) and leave us feedback on [Discord](https://dxos.org/discord)!
