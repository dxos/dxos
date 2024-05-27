---
order: 1
headerDepth: 0
---

# Quick Start

::: warning Technology Preview
Composer is not yet ready for production. There are bugs, and breaking changes may occur. Migration guides will be provided for version updates in the [release notes](https://github.com/dxos/dxos/releases).

All your feedback is most welcome on [Discord](https://discord.gg/eXVfryv3sW).
:::

<a href="https://composer.space" class="button" target="_blank">Open Composer</a>

## Creating

Click the <HopeIcon icon="plus" /> next to your <span class="composer-green">`Personal Space`</span> in the sidebar to create a new document.

The contents of your personal space will be visible only to you.

## Sharing

Composer is organized into [spaces](./user-guide/spaces.md) for grouping and sharing content.

Click the <HopeIcon icon="plus" /> next to <span class="composer-pink">`Shared Spaces`</span> in the sidebar to create a new space.

Click the <HopeIcon icon="dots-three-vertical" /> next to the new space to open the menu and select `Share space`{class="ph ph-users"}.

Create single or multi-use invitations by clicking `Invite`{class="ph ph-user-plus"}.

Share the link or QR code with others to join them to the space.

## Adding Devices

This allows for instant sharing and sync of all your content between other devices (or browser profiles) you own.

Click the profile button <HopeIcon icon="circle" /> and select `Add device`{class="ph ph-plus"}.

Scan the QR code or copy and paste the link to another device or browser window to continue.

After entering the authorization code, the new device will begin replicating all your spaces.

::: note Availability

Composer shares data only between devices that are online at the same time.

While it's possible to sync data between devices this way, it's also possible that some users may never see each-other's changes if they don't spend enough time online at the same time (e.g.: due to time zones, or work schedules, etc).

The solution requires that at least one device is always available on the network for every space.

The DXOS [`Agent`](../guide/tooling/cli/agent.md) is a component anyone can run on their computer to ensure that their spaces are always available to other devices, even when they are offline.

The DXOS Agent is also available in a [hosted version]() which offers better uptime and backup features.

:::
