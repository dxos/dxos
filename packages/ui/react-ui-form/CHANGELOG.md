# @dxos/react-ui-form

## 0.12.0

### Minor Changes

- a09e18e: `CreateObjectResult.object` is now optional, and so is the value a `CreateEntryOverride.createObject` resolves to. Some creates legitimately finish without an object: the connector create hands off to an OAuth popup or a credential dialog, and the `Connection` appears later, out of band.

  The contract previously demanded an object, so `plugin-connector` satisfied it with `undefined as unknown as Obj.Unknown` — and every caller that trusted the type then crashed on it. Creating a Connection threw `Invalid argument 'object': expected object` from `Obj.getURI` as the create-object dialog tried to navigate to the thing that did not exist yet. The three call sites that dereferenced the result (`ObjectFormDialog`, the database app-graph-builder extension, and `DefaultProperties`) now check before navigating; `RefField` already did.

  Implementors returning a real object are unaffected. Callers reading `result.object` must now handle `undefined`.

### Patch Changes

- 77a2d34: Replace `SpaceOperation.OpenCreateObject` with `SpaceOperation.OpenObjectForm`, which returns a reference to the object the user confirmed (or nothing if the dialog was dismissed) instead of taking an `onCreateObject` callback. It also accepts a `schema` for callers with an ad-hoc form schema, and a `mode: 'live'` that adds the object to the database before the form opens — so fields resolving against the database behave as they do after creation — and removes it again on dismissal. This is a breaking rename: replace `OpenCreateObject` with `OpenObjectForm` and `initialFormValues` with `defaults`. A form whose root is a discriminated union now opens on the union's first member, and the required-field asterisk clears once a field holds a value.
- Updated dependencies [af1c007]
- Updated dependencies [106d38a]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [96f94c2]
- Updated dependencies [0fe00c5]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [ea11703]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [e094f74]
- Updated dependencies [4800a6f]
- Updated dependencies [1b62726]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [2c442f9]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [7d000b9]
- Updated dependencies [813069c]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [8ca2ac7]
- Updated dependencies [098a0bb]
- Updated dependencies [0132aab]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bcfe4c5]
- Updated dependencies [41e2750]
- Updated dependencies [ebb8f4a]
- Updated dependencies [557e243]
- Updated dependencies [ca34a80]
- Updated dependencies [29543ca]
- Updated dependencies [c0e5651]
- Updated dependencies [24fcadc]
- Updated dependencies [4804da0]
- Updated dependencies [d4b4919]
- Updated dependencies [63e500b]
- Updated dependencies [19f19a2]
- Updated dependencies [0a3e9dd]
- Updated dependencies [256f286]
- Updated dependencies [306f50d]
- Updated dependencies [6c881a2]
- Updated dependencies [cc9b81f]
- Updated dependencies [5b504b4]
- Updated dependencies [eb95cd7]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [2513a52]
- Updated dependencies [1d6f730]
- Updated dependencies [b125655]
- Updated dependencies [f4c2702]
- Updated dependencies [318bbad]
- Updated dependencies [fc83abd]
- Updated dependencies [8904184]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [ea11703]
- Updated dependencies [18597fc]
- Updated dependencies [881f900]
- Updated dependencies [0c92b44]
- Updated dependencies [72b2984]
- Updated dependencies [32584c9]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [e8088ea]
- Updated dependencies [928e0b2]
- Updated dependencies [5d816a6]
- Updated dependencies [f9816c0]
- Updated dependencies [06cbe76]
- Updated dependencies [40b50c2]
- Updated dependencies [4ae2005]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
  - @dxos/echo@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/ui-editor@0.12.0
  - @dxos/react-ui-list@0.12.0
  - @dxos/lit-ui@0.12.0
  - @dxos/ui-theme@0.12.0
  - @dxos/react-ui-editor@0.12.0
  - @dxos/ui-types@0.12.0
  - @dxos/react-ui-components@0.12.0
  - @dxos/schema@0.12.0
  - @dxos/util@0.12.0
  - @dxos/echo-doc@0.12.0
  - @dxos/echo-react@0.12.0
  - @dxos/react-ui-markdown@0.12.0
  - @dxos/react-ui-search@0.12.0
  - @dxos/react-ui-pickers@0.12.0
  - @dxos/ui@0.12.0
  - @dxos/async@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/invariant@0.12.0
  - @dxos/keys@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/echo@0.11.1
- @dxos/echo-doc@0.11.1
- @dxos/echo-protocol@0.11.1
- @dxos/echo-react@0.11.1
- @dxos/effect@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/lit-ui@0.11.1
- @dxos/log@0.11.1
- @dxos/react-client@0.11.1
- @dxos/react-ui-components@0.11.1
- @dxos/react-ui-editor@0.11.1
- @dxos/react-ui-list@0.11.1
- @dxos/react-ui-markdown@0.11.1
- @dxos/react-ui-pickers@0.11.1
- @dxos/react-ui-search@0.11.1
- @dxos/schema@0.11.1
- @dxos/types@0.11.1
- @dxos/ui@0.11.1
- @dxos/ui-editor@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- 848ba1b: Add a `Slider` primitive built on the Radix slider (`Slider.Root`/`Track`/`Range`/`Thumb` composed behind a single themed component), supporting one or more thumbs, horizontal and vertical orientation, and a disabled state. `react-ui-form`'s `Form.Row` gains an additive `labelEnd` slot that renders trailing content at the end of the label row, so a field can show a live value beside its label without nesting it inside `Input.Label` (which would change the input's accessible name).

### Patch Changes

- 717edc0: Add a `hideEmpty` option to `Form` (default `true`) controlling whether empty-valued fields are omitted when read-only; set `hideEmpty={false}` to keep the full set of schema fields visible as static rows. Also disable the underlying `Select.Root` in `SelectField` when read-only so the popover no longer opens.
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [aea1e6e]
- Updated dependencies [9da013f]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [53fde97]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [a256a87]
- Updated dependencies [bce1dbc]
- Updated dependencies [a31ef40]
- Updated dependencies [ed992c2]
- Updated dependencies [e510f3b]
- Updated dependencies [ed992c2]
- Updated dependencies [3f1fc67]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [717edc0]
- Updated dependencies [2e10525]
- Updated dependencies [6a03a30]
- Updated dependencies [2fe5a7a]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [277e365]
- Updated dependencies [ba7aabf]
- Updated dependencies [d958118]
- Updated dependencies [2a68c3b]
- Updated dependencies [6d2afe0]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [9cde1c6]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [6e4ac74]
- Updated dependencies [51aaffe]
- Updated dependencies [801b77f]
- Updated dependencies [59a65a8]
- Updated dependencies [5f08a6a]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [3761762]
- Updated dependencies [c9da903]
- Updated dependencies [55bb048]
- Updated dependencies [4bb7e3b]
- Updated dependencies [4df6cf3]
- Updated dependencies [77fff35]
- Updated dependencies [6e624bd]
- Updated dependencies [686fac1]
- Updated dependencies [96109be]
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [392c700]
- Updated dependencies [20153c0]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [a49131a]
- Updated dependencies [ac51564]
- Updated dependencies [a1c89fa]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/react-ui-list@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/react-ui-editor@0.11.0
  - @dxos/ui-editor@0.11.0
  - @dxos/ui@0.11.0
  - @dxos/react-ui-search@0.11.0
  - @dxos/util@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-components@0.11.0
  - @dxos/types@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/echo-react@0.11.0
  - @dxos/react-ui-markdown@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/echo-doc@0.11.0
  - @dxos/react-ui-pickers@0.11.0
  - @dxos/lit-ui@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/echo-protocol@0.11.0
  - @dxos/invariant@0.11.0
