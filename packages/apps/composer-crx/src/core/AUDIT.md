# Composer CRX — `core/`

Extension-side logic shared by the background worker, content script, and side panel. Each
subfolder is a self-contained module exported via its `index.ts`.

| Folder        | Responsibility                                                                                                                                                                                                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `actions/`    | The page-action system: serializable action descriptors + the cached registry (`registry.ts`), URL / DOM-predicate matching (`match-pattern.ts`), and the invoke → run → deliver flows with their ack/message types (`invoke.ts`, `deliver.ts`, `thumbnail.ts`, `types.ts`, `util.ts`). |
| `bridge/`     | Composer tab discovery and navigation: find / focus / open the best Composer tab (`sender.ts`) and the configurable match-pattern list of Composer origins — `getComposerUrls` / `setComposerUrls` / `isComposerUrl` (`urls.ts`).                                                       |
| `extractors/` | Bundled DOM extractors that turn the current page into a serializable `Snapshot` (`snapshot.ts`, `types.ts`). Run in the content script on behalf of an action.                                                                                                                         |
| `image/`      | Image actions. `createThumbnail` uploads an image to the EDGE image service and stores the hosted URL for the panel to consume.                                                                                                                                                         |
| `picker/`     | In-page DOM element picker: `startPicker` / `pickSnapshot` (`picker.ts`), favicon/selection/hint harvesting (`harvest.ts`), the picker notice overlay (`notice.ts`), and a developer-mode snapshot preview (`debug-preview.ts`).                                                        |
| `proxy/`      | Search render-proxy and ping: render a URL in a background tab and return its HTML, plus the content-script relay handlers and ack/request types (`handler.ts`, `render.ts`, `types.ts`).                                                                                               |

## Naming note

`actions/` is the page-action registry/invocation system (renamed from `page-actions/`). `image/` is
the single image/thumbnail action (renamed from the former generic `actions/`); the two were split so
the names no longer collide.
