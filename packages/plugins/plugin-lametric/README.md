# @dxos/plugin-lametric

Shows a Composer space on a [LaMetric TIME](https://store.lametric.com/products/lametric): a progress
bar while a task is running, the space's statistics otherwise.

## Setup

LaMetric does not allow a custom indicator app to be pushed to over the local network — local push
goes through their stock **My Data (DIY)** app. Setup is therefore short, and needs no app of your
own.

### 1. Install My Data (DIY) and set it to Push

The device only displays apps from LaMetric's market and offers no way to draw arbitrary pixels.
**My Data (DIY)** is their generic "bring your own data" app: it renders a `frames` array you supply.
Composer never writes to the display directly — it writes frames into this app's slot. That is the
role `@dxos/composer-stream-deck` plays for the Stream Deck, except LaMetric ships it, which is why
this project needs no companion application of its own.

1. From the LaMetric mobile app, install **My Data (DIY)** from the LaMetric Market.
2. Open it and set its mode to **Push**.

**Both steps are required.** With no mode selected the app has no data source: it ignores every
update, answers `{"success":{"message":"ok"}}` regardless, and keeps showing its placeholder — an
arrow and a zero.

### 2. Collect two values

**Device address** — on the device itself, `Settings` → `Wi-Fi`, which lists its IP. If it is not
shown there:

- Your router's client list will name it (`LM` followed by digits).
- Or find it by the ports it serves — the device answers on 8080 and 4343 and identifies itself with
  a `Basic realm="global"` challenge:

  ```bash
  for i in $(seq 1 254); do (nc -z -G 1 -w 1 "192.168.1.$i" 8080 2>/dev/null && echo "192.168.1.$i") & done; wait
  ```

  Substitute your own subnet, then confirm the candidate:

  ```bash
  curl -s -D - -o /dev/null http://<address>:8080/api/v2
  ```

  A LaMetric answers `401` with `Server: Lighttpd` and `WWW-Authenticate: Basic realm="global"`.

**Device API key** — the **Devices** section of your account on
[developer.lametric.com](https://developer.lametric.com). The username is always the literal `dev`;
this key is the password.

### 3. Configure the plugin

Enable the LaMetric plugin in Composer and fill in those two fields **in the plugin's settings** —
the key is stored there, masked, and never needs to go in a file or an environment variable. That is
the whole setup: the
plugin reads the device's app list and finds the My Data (DIY) widget itself, because that widget's
UUID identifies one installation of the app and is not shown anywhere in LaMetric's apps or portal.

### 4. Run the desktop app

The plugin only pushes from a Tauri build, so `vite dev` in a browser will do nothing:

```bash
moon run composer-app:tauri-dev
```

The first run compiles the Rust side, including the newly added `tauri-plugin-http`, so expect it to
take a while; later runs are incremental. Once Composer is up, enable **LaMetric** in the plugin
registry, open its settings, and enter the device address and API key. Pushing starts as soon as both
are set — there is nothing to press.

If the display does not change, check in this order:

1. **Is My Data (DIY) the app currently on screen?** The device only shows one app at a time; press
   its side buttons to reach it. Frames are pushed whether or not it is showing.
2. **Is the address right?** `curl -s -D - -o /dev/null http://<address>:8080/api/v2` should answer
   `401` with `Basic realm="global"`.
3. **Is the key right?** Adding `-u dev:<key>` to that same request should turn the `401` into a
   `200`.

### Cloud push (optional, off-network)

Pushing while away from the device's network is a **different mechanism**, not the same request to a
different host: it needs a published indicator app of your own on developer.lametric.com, and its
app ID, widget ID and access token go in the plugin's remaining settings fields. Leave the device
address blank to use it. Local push is preferred whenever the address is set — it is faster and
works with no internet.

## Desktop only

Pushes are issued through Tauri's HTTP client, from Rust rather than from the web view, so **this
plugin does nothing in a browser build**. The reasons differ per transport, and CORS is only one of
them:

- **Cloud**: `developer.lametric.com` answers a CORS preflight with `405` and sends no
  `Access-Control-*` header, while `X-Access-Token` forces a preflight on every request. Genuinely
  unreachable from any page.
- **Device**: the device itself is permissive — it returns `Access-Control-Allow-Origin: *` and
  `Access-Control-Allow-Headers: *`. What blocks a hosted Composer is the *transport*: `http://…:8080`
  is mixed content from an HTTPS page, and `https://…:4343` presents a self-signed certificate the
  browser will not accept. From an `http://localhost` dev origin the device is in fact reachable
  directly.

Browser support for the cloud path means an edge worker proxying to `developer.lametric.com`. The
transport interface already isolates the origin, so that is another implementation and nothing else
changes.

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
