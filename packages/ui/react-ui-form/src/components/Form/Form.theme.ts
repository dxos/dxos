//
// Copyright 2026 DXOS.org
//

import { type VariantProps, tv } from '@dxos/ui-theme';

/** Visual variants for {@link Form}. `settings` is the bordered two-column settings-panel look. */
export type FormVariant = NonNullable<VariantProps<typeof formStyles>['variant']>;

/** Non-className behavior flags, keyed by {@link FormVariant}. */
export type FormBehavior = { showDescription: boolean };

const formStyles = tv({
  slots: {
    section: 'flex flex-col pt-form-section-gap first:pt-0',
    sectionTitle: 'text-lg',
    sectionDescription: 'text-description',
    fieldSet: '',
    field: '',
    labelContainer: '',
    labelText: '',
    description: 'text-description',
    control: '',
    validation: '',
  },
  variants: {
    variant: {
      default: {},
      settings: {
        sectionTitle: 'px-trim-md text-xl',
        sectionDescription: 'px-trim-md',
        fieldSet: 'flex flex-col gap-trim-md pt-trim-md',
        field: `grid grid-cols-2 [grid-template-areas:'header_control''description_description'] gap-x-trim-lg gap-y-0 p-trim-md border border-separator rounded-sm`,
        labelContainer: '[grid-area:header]',
        labelText: 'pb-trim-md text-base-fg text-lg',
        description: '[grid-area:description] text-base text-description',
        control: '[grid-area:control] flex items-center justify-end',
        // The error block is outside the named areas; span it full-width so `layout='full'` settings forms don't misplace it.
        validation: 'col-span-full',
      },
    },
  },
  defaultVariants: { variant: 'default' },
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
