---
'@dxos/brand': minor
'@dxos/app-framework': patch
'@dxos/react-ui': minor
---

`@dxos/brand/channels` names the prerelease channels (`dev`, `preview`, `staging`) and the colour each one paints the mark, and `channelMarkFilter` turns that colour into a CSS filter over the released artwork. The boot loader applies that filter to the mark, the ring and its head together, so a channel build no longer ships its own copy of the mark and the ring agrees with it; the composer app's icon variants are generated from the same definitions. The brand `Icons` story shows the channels in a row.

The boot loader's activation row is a flex row translated as one group: a plugin's icon is appended at the end and fades in, and the row slides half a slot to stay centred on an eased count driven by the same frame loop as the ring, so arrivals in quick succession keep the row moving rather than stopping it between each.

Breaking: `react-ui`'s `Stepper` is renamed `Steps`, after the Ark machine it sits on, as the rest of the family is named: `StepsProps`, `StepsStyleProps`, `stepsTheme` and the `steps.*` theme keys follow. The `Step`, `StepOptions`, `stepCount` and `stepAt` helpers keep their names.
