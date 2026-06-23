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
    content: 'pb-3',
    section: 'flex flex-col py-form-section-gap first:pt-0',
    sectionTitle: 'text-lg',
    sectionDescription: 'text-description',
    fieldSet: '',
    field: '',
    fieldLabel: 'h-8 grid grid-cols-[1fr_auto_auto] items-center select-none',
    fieldLabelText: '',
    fieldDescription: 'text-description',
    fieldControl: '',
    fieldValidation: '',
  },
  variants: {
    variant: {
      default: {},
      settings: {
        content: 'dx-document',
        // Gap on the section spaces its direct children — section title/description and, for action
        // panels, the `Form.Row`s placed directly in the section (which have no `fieldSet` wrapper).
        section: 'py-form-section-gap!',
        sectionTitle: 'px-trim-md text-xl',
        sectionDescription: 'px-trim-md',
        // No top padding: the section gap already separates the field set from the title above it.
        fieldSet: 'flex flex-col gap-trim-md',
        field: mx(
          'grid',
          'grid-cols-1 [grid-template-areas:"header""description""control""validation"]',
          'md:grid-cols-2 md:[grid-template-areas:"header_control""description_description""validation_validation"]',
          'gap-x-trim-lg gap-y-0 p-trim-md border border-input-separator rounded-md',
        ),
        fieldLabel: '[grid-area:header]',
        fieldLabelText: 'text-base-fg text-lg',
        fieldDescription: '[grid-area:description] pt-trim-md text-description',
        fieldControl: '[grid-area:control] flex items-center md:justify-end pt-3 md:pt-0',
        fieldValidation: '[grid-area:validation]',
      },
    },
  },
  defaultVariants: {
    variant: 'default',
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
