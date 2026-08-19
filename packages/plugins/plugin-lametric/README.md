# @dxos/plugin-lametric

Shows a Composer space on a [LaMetric TIME](https://store.lametric.com/products/lametric): a progress
bar while a task is running, the space's statistics otherwise.

## Setup

The device shows data through an *Indicator App*, so one has to exist before anything can be pushed
to it. This is a one-time step and needs a LaMetric account.

### 1. Create the app

On [developer.lametric.com](https://developer.lametric.com), create a new indicator app:

1. Pick an icon and enter an initial value — the default the device shows before the first push.
2. Set the communication type to **`Local Push`**. This is the one that matters: it yields a push URL
   pointing at the device on your own network, which is the transport this plugin prefers. `Next`.
3. Enter a name and description, then `Save`.

### 2. Publish and install it

Click **`Publish`** and wait for the confirmation email, usually under two minutes. This is not
optional — the device rejects updates to an unpublished app. Then install the app on your device from
the LaMetric mobile app.

### 3. Collect four values

| Value | Where |
| --- | --- |
| App ID, Widget ID | The app's **`Published V1`** tab. It shows a sample `curl` whose URL ends `/api/v1/dev/widget/update/<app-id>/<widget-id>` |
| Access token | The `X-Access-Token` header in that same sample |
| Device address | LaMetric mobile app → `Settings` → `Wi-Fi` → `IP Address` |

### 4. Configure the plugin

Enable the LaMetric plugin in Composer and fill those four fields in its settings.

The device address is optional. With it, Composer pushes straight to the device over your network;
without it, pushes go through LaMetric's cloud — which is slower and, if the app was created as
`Local Push`, may not be accepted at all. Set the address if you have it.

## Desktop only

Pushes are issued through Tauri's HTTP client, from Rust rather than from the web view, so **this
plugin does nothing in a browser**. That is not a shortcut: neither endpoint is reachable from a web
page.

- LaMetric's cloud answers a CORS preflight with `405` and sends no `Access-Control-*` header, and
  the `X-Access-Token` header forces a preflight on every request.
- The LAN device is plain HTTP (blocked as mixed content from an HTTPS page) or a self-signed
  certificate on port 4343.

Supporting the browser means an edge worker proxying to `developer.lametric.com`. The transport
interface already isolates the base URL, so that is a third implementation and nothing else changes.

## What it shows

The display is a 37x8 white LED matrix, so roughly nine characters are legible at once before the
device starts scrolling. Frames therefore stay terse, and at most four are pushed — the device cycles
them at a fixed rate, so a longer list delays every number in it.

| State | Frame |
| --- | --- |
| A task with a known total | A goal frame; the device draws its own bar |
| A task reporting no total | `Indexing 128` |
| Nothing running | `42 obj`, `3 feeds`, `12 types`, `21 plugins` |

Favorites are not shown. LaMetric's buttons are not bindable from the API, so a favorite would be a
name scrolling past with nothing to press.

## Development

The space itself is projected by `plugin-space`'s `SpaceCapabilities.Dashboard`, which
`plugin-stream-deck` also consumes; this plugin only maps those facts onto the device's frames.

`VirtualLaMetric` renders the matrix on screen from the same pure functions that build the pushed
payload, so the storybook shows what the hardware shows without needing the hardware:

```
moon run plugin-lametric:test
moon run plugin-lametric:test-storybook
```

Design: [`agents/superpowers/specs/2026-08-19-lametric-design.md`](../../../agents/superpowers/specs/2026-08-19-lametric-design.md).
