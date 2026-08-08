# @dxos/echo-panproto

## 1.0.0

### Patch Changes

- Updated dependencies [3958355]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [b600f72]
- Updated dependencies [bcfe4c5]
  - @dxos/echo@1.0.0
  - @dxos/effect@1.0.0
  - @dxos/invariant@1.0.0

## 0.11.1

### Patch Changes

- @dxos/echo@0.11.1
- @dxos/effect@0.11.1
- @dxos/invariant@0.11.1

## 0.11.0

### Minor Changes

- 9da013f: New package `@dxos/echo-panproto`: declarative, JSON-serializable lenses (`Panproto.Lens`) between ECHO objects and foreign wire records, executed by a runner (`Panproto.encode`/`decode`) rather than expressed as closures.

  Annotation-driven publishing of ECHO objects to the AT Protocol. `@dxos/schema` gains `AtprotoRecordAnnotation` (type-level: target collection, record-key strategy, and a declarative serializable lens) and `AtprotoVisibilityAnnotation` (field-level, private by default — a field is published only when explicitly marked), so a generic companion can discover and publish any annotated type without knowing the type itself.

  `MasterDetail` moves from plugin-routine into `@dxos/react-ui-list` as a reusable primitive: a selectable master list above a detail slot, nestable by placing another `MasterDetail` in `detail`. Per-row overflow menus are driven by `useMenuBuilder` from `@dxos/react-ui-menu`.

  `ComboboxField` now shows the selected option's label rather than the stored value, which is often an opaque id the user never chose to see.

### Patch Changes

- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [12fd785]
- Updated dependencies [5f08a6a]
- Updated dependencies [3761762]
- Updated dependencies [4bb7e3b]
- Updated dependencies [686fac1]
- Updated dependencies [ac51564]
  - @dxos/echo@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/invariant@0.11.0
