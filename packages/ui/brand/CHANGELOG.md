# @dxos/brand

## 0.12.0

### Minor Changes

- 9714c75: `@dxos/brand/channels` names the prerelease channels (`dev`, `preview`, `staging`) and the colour each one paints the mark, and `channelMarkFilter` turns that colour into a CSS filter over the released artwork. The boot loader applies that filter to the mark, the ring and its head together, so a channel build no longer ships its own copy of the mark and the ring agrees with it; the composer app's icon variants are generated from the same definitions. The brand `Icons` story shows the channels in a row.

  The boot loader's activation row is a flex row translated as one group: a plugin's icon is appended at the end and fades in, and the row slides half a slot to stay centred on an eased count driven by the same frame loop as the ring, so arrivals in quick succession keep the row moving rather than stopping it between each.

  Breaking: `react-ui`'s `Stepper` is renamed `Steps`, after the Ark machine it sits on, as the rest of the family is named: `StepsProps`, `StepsStyleProps`, `stepsTheme` and the `steps.*` theme keys follow. The `Step`, `StepOptions`, `stepCount` and `stepAt` helpers keep their names.

### Patch Changes

- Updated dependencies [6a457ac]
- Updated dependencies [2d58ea5]
- Updated dependencies [7ec1738]
- Updated dependencies [d4b4919]
- Updated dependencies [e680b16]
- Updated dependencies [a805212]
- Updated dependencies [32584c9]
- Updated dependencies [928e0b2]
- Updated dependencies [520c34f]
  - @dxos/ui-theme@0.12.0

## 0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [e0e1a9f]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [2fe5a7a]
- Updated dependencies [d958118]
- Updated dependencies [e65432c]
- Updated dependencies [c9651f1]
- Updated dependencies [717edc0]
- Updated dependencies [51aaffe]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [55bb048]
- Updated dependencies [4df6cf3]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
  - @dxos/react-ui@0.11.0
  - @dxos/ui-theme@0.11.0
