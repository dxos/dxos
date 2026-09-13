//
// Copyright 2026 DXOS.org
//

import { type VariantProps, mx, tv } from '@dxos/ui-theme';

/** Visual variants for {@link Form}. `settings` is the bordered two-column settings-panel look. */
export type FormVariant = NonNullable<VariantProps<typeof formStyles>['variant']>;

/** Non-className behavior flags, keyed by {@link FormVariant}. */
export type FormBehavior = { showDescription: boolean };

const formStyles = tv({
  slots: {
    viewport: '',
    // Bottom padding on the body, so the last field never sits flush against its host's edge
    // (a form in a card, a dialog body, a scrolled panel all need it).
    content: 'pb-form-padding',
    // A `<fieldset>`: laid out as a column so its legend (floated by the fieldset theme) is a child
    // in flow rather than the browser's border-drawn legend. The depth variant decides the chrome.
    // `relative` anchors `fieldSetActions`; the legend stays the fieldset's own child to name the group.
    fieldSet: 'relative flex flex-col',
    fieldSetLegend: 'w-full',
    fieldSetTitle: '',
    fieldSetDescription: 'text-description',
    // Padding under whichever of legend or description comes last.
    fieldSetHeader: '',
    // Out of flow, so a description below the label does not push the actions down.
    fieldSetActions: 'absolute inset-block-start-0 inset-inline-end-0 flex items-center',
    // The folding body of a collapsible field set.
    fieldSetBody: 'flex flex-col',
    field: '',
    // Columns: label (fills) → optional `labelEnd` readout → error icon (or its spacer) → optional trailing `button`.
    // Height comes from the label cell (`Field.Label` is a control-height row); this only lays the
    // columns out and centres the trailing cells against it.
    fieldLabel: 'grid grid-cols-[1fr_auto_auto_auto] items-center',
    fieldLabelText: 'text-sm text-description',
    fieldDescription: 'text-sm text-green-500',
    fieldControl: '',
    fieldValidation: '',
    // Action bar (cancel/save), equal-width columns flowing horizontally.
    actions: 'grid grid-flow-col gap-form-gap auto-cols-fr py-form-padding',
    // Standalone submit row (full-width primary button).
    submit: 'flex w-full pt-form-padding',
  },
  variants: {
    variant: {
      default: {},
      settings: {
        content: 'dx-document',
        field: mx(
          'grid',
          'grid-cols-1 [grid-template-areas:"header""description""control""validation"]',
          'md:grid-cols-2 md:[grid-template-areas:"header_header""description_control""validation_validation"]',
          'gap-x-trim-xl gap-y-0 p-trim-md border border-input-separator rounded-md',
        ),
        fieldLabel: '[grid-area:header]',
        fieldLabelText: 'text-base-fg text-lg',
        // `min-w-0` on both cells: a grid track is `minmax(auto, 1fr)`, so its automatic MINIMUM is
        // the content's min-content width — a control wider than half the row (a DID, a long URL)
        // pushes its track past `1fr` and overflows the field's own border rather than shrinking.
        fieldDescription: '[grid-area:description] min-w-0 pt-trim-xs text-description',
        // The child needs it too: a flex item's default `min-width: auto` reintroduces the same floor
        // one level down, so the cell would shrink while the control inside it would not.
        fieldControl:
          '[grid-area:control] flex justify-end items-start min-w-0 [&>*]:min-w-0 [&>*]:max-w-full pt-trim-md md:pt-0',
        fieldValidation: '[grid-area:validation]',
      },
    },
    // Where the row lays its label; the theme decides how, and the settings card keeps its grid.
    labelPlacement: {
      above: {},
      beside: {},
    },
    // A top-level field set is a titled section; a nested one is an indented, bordered group.
    depth: {
      root: {
        fieldSet: 'py-form-section-gap first:pt-0',
        fieldSetTitle: 'text-lg',
      },
      // The legend sits above the box, like a field's label above its control; the body is the box.
      nested: {
        fieldSetBody: 'border border-subdued-separator rounded-sm px-trim-sm py-trim-sm',
      },
    },
  },
  compoundVariants: [
    {
      // The control leads and the label follows it on one line; description and error span both.
      variant: 'default',
      labelPlacement: 'beside',
      class: {
        field: 'grid grid-cols-[auto_1fr] items-center gap-x-2 mt-2',
        fieldDescription: 'col-span-2',
        fieldValidation: 'col-span-2',
      },
    },
    {
      variant: 'settings',
      depth: 'root',
      class: {
        // The gap spaces the section's direct children: its header and every field or group in it.
        fieldSet: 'py-form-section-gap! gap-trim-md',
        fieldSetHeader: 'pb-form-section-gap',
        fieldSetActions: 'inset-block-start-form-section-gap px-trim-md',
        fieldSetTitle: 'px-trim-md text-xl',
        fieldSetDescription: 'px-trim-md',
        fieldSetBody: 'gap-trim-md',
      },
    },
    {
      variant: 'settings',
      depth: 'nested',
      class: {
        // The same gap as the root, or fields inside a group sit flush while their siblings do not.
        fieldSetBody: 'gap-trim-md',
      },
    },
  ],
  defaultVariants: {
    variant: 'default',
    labelPlacement: 'above',
    depth: 'root',
  },
});

/** {@link Form} theme template: a tailwind-variants recipe (`styles`) plus non-class `behavior`. */
export const formTheme = {
  styles: formStyles,
  behavior: {
    default: {
      showDescription: false,
    },
    settings: {
      showDescription: true,
    },
  } satisfies Record<FormVariant, FormBehavior>,
};

/** Slot names of {@link formTheme.styles}, for `bridgeTv` registration. */
// Object.keys widens to string[]; the slot names are statically known.
export const formSlots = Object.keys(formTheme.styles()) as Array<keyof ReturnType<typeof formTheme.styles>>;
