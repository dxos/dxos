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
    content: '',
    section: 'flex flex-col pt-form-section-gap first:pt-0',
    sectionTitle: 'text-lg',
    sectionDescription: 'text-description',
    fieldSet: '',
    field: '',
    description: 'text-description',
    control: '',
    validation: '',
  },
  variants: {
    variant: {
      default: {},
      settings: {
        viewport: 'py-8',
        content: 'dx-document',
        sectionTitle: 'px-trim-md text-xl',
        sectionDescription: 'px-trim-md',
        fieldSet: 'flex flex-col gap-trim-md pt-trim-md',
        field: mx(
          'grid',
          'grid-cols-1 [grid-template-areas:"header""description""control"]',
          'md:grid-cols-2 md:[grid-template-areas:"header_control""description_description"]',
          'gap-x-trim-lg gap-y-0 p-trim-md border border-separator rounded-sm',
        ),
        description: '[grid-area:description] text-base text-description',
        control: '[grid-area:control] flex items-center md:justify-end pt-3 md:pt-0',
        // The error block is outside the named areas; span it full-width so `layout='full'` settings forms don't misplace it.
        validation: 'col-span-full',
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
