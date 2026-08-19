# @dxos/plugin-lametric

Shows a Composer space on a [LaMetric TIME](https://store.lametric.com/products/lametric): a progress
bar while a task is running, the space's statistics otherwise.

## Setup

LaMetric does not allow a custom indicator app to be pushed to over the local network — local push
goes through their stock **My Data (DIY)** app. Setup is therefore short, and needs no app of your
own.

### 1. Install My Data (DIY)

From the LaMetric mobile app, install **My Data (DIY)** from the LaMetric Market onto your device.

### 2. Collect two values

| Value | Where |
| --- | --- |
| Device address | LaMetric mobile app → `Settings` → `Wi-Fi` → `IP Address` |
| Device API key | The **Devices** section of your account on [developer.lametric.com](https://developer.lametric.com) |

### 3. Configure the plugin

Enable the LaMetric plugin in Composer and fill in those two fields. That is the whole setup: the
plugin reads the device's app list and finds the My Data (DIY) widget itself, because that widget's
UUID identifies one installation of the app and is not shown anywhere in LaMetric's apps or portal.

### Cloud push (optional, off-network)

Pushing while away from the device's network is a **different mechanism**, not the same request to a
different host: it needs a published indicator app of your own on developer.lametric.com, and its
app ID, widget ID and access token go in the plugin's remaining settings fields. Leave the device
address blank to use it. Local push is preferred whenever the address is set — it is faster and
works with no internet.

## Desktop only

Pushes are issued through Tauri's HTTP client, from Rust rather than from the web view, so **this
plugin does nothing in a browser**. That is not a shortcut: neither endpoint is reachable from a web
page.

- LaMetric's cloud answers a CORS preflight with `405` and sends no `Access-Control-*` header, and
  the `X-Access-Token` header forces a preflight on every request.
- The LAN device is plain HTTP (blocked as mixed content from an HTTPS page) or a self-signed
  certificate on port 4343, and its `Authorization` header forces a preflight too.

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

## The two transports

They share only a body. Assuming otherwise is the mistake this section exists to prevent.

| | Local | Cloud |
| --- | --- | --- |
| Host | `https://<device>:4343` (or `http://<device>:8080`) | `https://developer.lametric.com` |
| Path | `/api/v2/widget/update/com.lametric.diy.devwidget/<widget>` | `/api/v1/dev/widget/update/<app>/<widget>` |
| Auth | `Authorization: Basic dev:<device api key>` | `X-Access-Token: <token>` |
| App | LaMetric's stock DIY app, a fixed package | a published app of your own |
| Body | `{"frames": [...]}` | identical |

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
