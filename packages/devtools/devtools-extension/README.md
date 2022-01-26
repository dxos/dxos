# DevTools browser extension

Devtools browser extension.

## Installation

1. Grab a build from the [latest build](https://github.com/dxos/protocols).

`<img src="./images/jobs.png" width="520px">`

![alt text](https://github.com/dxos/protocols/blob/main/protocols/packages/devtools/devtools-extension/images/jobs.png?raw=true)


`<img src="./images/artifacts.png" width="420px">`

2. Unzip the downloaded file.
3. Go to `chrome://extensions` and enable developer mode.

`<img src="images/developer-mode.png" width="220px">`

4. Select `Load unpacked` and select the unzipped Devtools folder.

## Extension startup sequence

`<img src="docs/extension.png">`

1. SDK sets `window.__DXOS__` hook.
1. Content script is injected into the page automatically by chrome.
    1. Allows messaging with the page
    1. Sets up a RPC handler to inject the client API.
1. Devtools background page is created
    1. Waits for `window.__DXOS__` hook to appear.
    1. Creates devtools panel.
1. Devtools panel is loaded.
    1. Calls content script to inject client API into the page.
    1. Client API connects to the `window.__DXOS__` hook.
    1. Client API sends "ready" message.
1. Devtools pannel is ready.

## Development

### General

1. Clone this repo then install dependencies and build:

```
rushx build --to rush build --to @dxos/devtools
```

2. Then to build the extension.

```
rushx build
```

3. (Optional) Run the `rushx build:watch` for both `devtools-extension` and `devtools` and open the devtools in your browser.

TODO(burdon): `build:watch` not configured.

### Chrome

4. Open the __extensions__ manager in your browser: 

- [brave://extensions](brave://extensions)
- [chrome://extensions](chrome://extensions)
- Edge (Not Supported Yet)
- Safari (Not Supported Yet)

5. Make sure you have the `developer` toggle __on__ and click on `Load Unpacked Extension` button.
6. Search for the extension __dist__ folder (`<repo-root>/packages/devtools-extension/dist`) and select it.

### Firefox

4. Run `rushx pack:webext`.
5. Navigate to [This Firefox](about:debugging#/runtime/this-firefox) tab of the `about:debugging` page.
6. Click `Load Temporary Add-on...` and select the zip file in `web-ext-artifacts`.

An alternative method is to run `rushx start:firefox` which will run a temporary firefox instance with the extension installed. Running this way allows for integration with watch tools and reloading the extension by pressing `r` in the terminal.

## Troubleshooting

- Remove all tabs that contain the extension then remove the extension and reload it.

## Design

The content script attempts to detect the an object exposed by the SDK's client (window.__DXOS__).
It then sets-up a bridge that enables the devtools (and other components) to access the client via `crx-bridge` module.

## References

- Anatomy of an extension: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Anatomy_of_a_WebExtension#Background_pages
- This package is loosely based on the [Apollo DevTools](https://github.com/apollographql/apollo-client-devtools).

