---
title: September 2023 Recap
slug: september-2023-recap
date: 2023-10-06
description: September was an eventful month. The DXOS team traveled to St. Louis and attended Strange Loop and a Local-first Software Unconference. We also completed some major protocol upgrades and overhauled Composer, massively improving the drag-n-drop behavior, and rolling out new plu...
author: Rich Burdon
tags: []
featureImage: /blog/images/dxos-team-1.jpeg
---

September was an _event_ful month. The DXOS team traveled to St. Louis and attended [Strange Loop](#strange-loop) and a [Local-first Software Unconference](/blog/dxos-at-localfirst-in-st-louis). We also completed some major protocol upgrades and overhauled Composer, massively improving the drag-n-drop behavior, and rolling out new plugins and an improved layout.

## Strange Loop

A few team members enjoyed spreading the word about DXOS at the very last [Strange Loop Conference](https://www.thestrangeloop.com/) on Thursday and Friday, September 21-22. Strange Loop was an excellent time to meet with people from like-minded companies like [Ink & Switch](https://inkandswitch.com/), [Socket Supply](https://socketsupply.co/), [PartyKit](https://www.partykit.io/) and many others. There were also some relevant talks such as Martin Kleppmann's [New algorithms for collaborative text editing](https://www.youtube.com/watch?v=Mr0a5KyD6BU&list=PLcGKfGEEONaBNsY_bOj8IhbCPvj6OAdWo&index=9) and Brooklyn Zalenka's [IPVM: Seamless Services for an Open World](https://www.youtube.com/watch?v=Z5U8JQZXABs&list=PLcGKfGEEONaBNsY_bOj8IhbCPvj6OAdWo&index=10). Good times!

The best part of Strange Loop was all the folks who ventured out to the Local-First Software Unconference [the next day](/blog/dxos-at-localfirst-in-st-louis)!

## September Releases

Our primary focus in September was preparing DXOS for the demos at our events, which meant extending Composer's functionality while stabilizing the platform.

### Release 0.2.3

![](/blog/images/270084340-ca80ad63-bad1-42f8-8649-1828eb47b3f5-1.png)

`aurora-grid` for mosaic layouts

-   Added new components and stories for the `aurora-grid` package, which is a UI library for creating grid and mosaic layouts.
-   Adding identity and device key and a swarm layout to devtools.

Full release notes on [GitHub](https://github.com/dxos/dxos/releases/tag/v0.2.3).

### Release 0.2.1

0:00

/0:12

 1× 

In Release 0.2.1, we improved the appearance and code quality and applied consistent border styling to the `Table` component.

The key highlights are:

-   new [tasks template](https://docs.dxos.org/guide/cli/app-templates.html#tasks-template) 
-   configurable batching
-   fixed shell dark mode
-   composer new drag and drop foundation and fixed presence computation
-   neater vault reset page
-   interactive demo on the [DXOS website](https://dxos.org)
-   docs about shell and default space

Full release notes on [GitHub](https://github.com/dxos/dxos/releases/tag/v0.2.1).

### Release 0.2.0

0:00

/1:12

 1× 

__In Release 0.2.0, we introduced several improvements and fixes to DXOS apps and plugins, as well as some devtools and UI components.__

We released a breaking change which required you to reset your ECHO database through the upgrade.

Here are the key highlights: 

-   new spaces API and shell API
-   composer quality of life improvements, vim mode and show closed spaces
-   aurora light theme changes
-   tasks app example

Full release notes on [GitHub](https://github.com/dxos/dxos/releases/tag/v0.2.0).

## ICYMI

### Livestream with Chad Fowler of BlueYard Capital 

Last month [Jess Martin](https://twitter.com/jessmartin) of [DXOS](https://twitter.com/dxos_org) and [Chad Fowler](https://twitter.com/chadfowler) of [BlueYard Capital](https://twitter.com/blueyard) connected via livestream to discuss the power of local-first development with DXOS, demoing some simple SDK-based applications and showing off where we're going with an extensible application framework. Curious about why Chad had been looking forward to this livestream for over a year? Check out the full length video [here](https://www.youtube.com/watch?v=9HEAxBrKzGE), or watch a cut-down version focused on just a demo of DXOS [here](https://blog.dxos.org/rapid-fire-dxos-demo/) (There's even a transcript, for you "prose > video" folks).
