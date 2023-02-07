# Contributing to DXOS `react-components`

This package contains DXOS’s themes and basic components. The principles that guide the shape of the code in this package are the following:

## Code as accessibly as you can

If you’re unfamiliar with [WAI-ARIA](https://developer.mozilla.org/en-US/docs/Learn/Accessibility/WAI-ARIA_basics) & [WCAG](https://www.w3.org/TR/WCAG21/), have a look. It doesn’t have to be perfect, but it helps everyone to give a good faith effort. Here are some top tips, but this is by no means complete:

- If there’s a [Radix component](https://www.radix-ui.com/docs/primitives/components/accordion) that does what you’re trying to do, please use it.
  - There are good examples of styling Radix components using Tailwind here: https://tailwindcss-radix.vercel.app
- Every HTML element should have a [role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles), implied by semantic tags e.g. `<section/>`, or with the explicit `role` attribute e.g. `<div role="group"/>`.
  - Use `role="none"` if the element is just presentational so it stays out of the accessibility tree.
    - The children will still appear in the tree, [`aria-hidden`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-hidden) also hides children but do some reading on that before attempting
    - The accessibility tree can be viewed in a tab in your browser’s dev tools usually alongside the styles tab.
- Elements with a role that aren’t inherently their own labels should have a label, using either `htmlFor`, `aria-label`, or `aria-labelledby` attributes.
  - Buttons, headings, links etc are labelled by their content, so unless the content has no text they need nothing else.
  - Use the `Tooltip` component to label elements without visible text content (e.g. buttons that only have icons as content).
  - Use `useId` from `@dxos/react-components` to make testable unique id’s for labels and descriptions
- Try interacting with your component using the keyboard, make sure you can use the component as designed without using a mouse.
  - Avoid messing with `tabIndex`; if it seems like you might need to, double-check that Radix doesn’t already take care of it for you.
- Anything interactive should be at least 48px by 48px.
- Any text inputs should have a font size of at least 16px.
- Check that icons and text have at least AA contrast against their background: https://colourcontrast.cc
- Make sure your component doesn’t need more than [320px horizontal, 256px vertical space](https://www.w3.org/TR/WCAG21/#reflow) to function properly without hiding content.

## Code as internationally as you can

### Use translated user-facing text

Start with a string defined in your package’s `en-US.ts` file. Good translation keys are human-readable on their own and end in a key word:

- `heading` if it is a heading
- `label` if it is an accessible label for something
- `description` if it is an accessible description for something
- `message` if it is the content of something

Example:

```tsx
import { useTranslation } from '@dxos/react-components';

export const HelloWorld = () => {
  const { t } = useTranslation('examples')
  return <span>{t('hello world message')}</span>
}
```

### Use logical properties

[Logical properties](https://developer.mozilla.org/en-US/docs/Learn/CSS/Building_blocks/Handling_different_text_directions#logical_properties_and_values) give us simple CSS properties that are applied correctly regardless of an element’s writing direction.

Without logical properties:

```tsx
<div role='region' className='left-5 right-0 pl-2 pr-1 rtl:left-0 rtl:right-5 rtl:pl-1 rtl:pr-2'>{children}</div>
```

With logical properties:
```tsx
<div role='region' className='inline-start-5 inline-end-0 pis-2 pie-1'>{children}</div>
```

[Use this cheat sheet as a guide.](https://stevecochrane.github.io/tailwindcss-logical)

## Don’t put components with special dependencies in this package
Instead, components with special dependencies should have their own `apps/patterns/react-*` package.

## Create `dark:` values any time you use a color
All of these components should work in light and dark themes. Every time you use a Tailwind utility class that picks a color, like `text-neutral-800`, ensure you also specify how it should look in dark themes e.g. `dark:text-neutral-200`.

## Only use colors from the semantic palettes
For grays, use `neutral`. For primary blue, use `primary`. There’s also `info`, `warning`, `success`, and `error`.

## Keep styles in JS; make style modules as needed
  - If you find yourself needing to share the same styles or just wanting a semantic name for a group of styles, create a module called `{component}Styles.ts` which exports styles for components of that ilk.
  - Exports in style modules should either be string constants or functions that accept two optional arguments: a props argument first, followed by `themeVariant` as needed.
  - If the styles are very particular to a component, keep it in the component’s directory, otherwise it can go in the `styles` directory if other components may also use it.

Note that the repository hasn’t followed this particular rule very well, so we still have some cleanup to do in this regard.

## Try to be efficient with styles

Not everything needs `flex`. Flex items (children of nodes with `flex`) don’t also need `flex` in order to grow or shrink, simply add `grow` or `shrink`, e.g.

```tsx
<div role='none' className='flex items-center'>
  <span className='grow'>{t('some sort of label')}</span>
  <CaretRight />
</div>
```

Keep it simple: use inherent positioning & layouts wherever doing so would have an equivalent result.

## Use slots

Slots give developers access to other attributes they might want to set on a component’s actual HTML elements. Provide a slots interface with a slot for each HTML element rendered by the component, e.g.:

```ts
interface ComponentSlots {
  root?: ComponentPropsWithoutRef<'div'>;
  label?: ComponentPropsWithoutRef<'h3'>;
  description?: ComponentPropsWithoutRef<'p'>;
}

interface ComponentProps {
  // ...
  slots?: ComponentSlots;
  // ...
}

```

Name slots semantically. If there is any top-level element wrapping things, call it `root`.

A component’s non-slot props should only pick specific props from an element the component renders, do not spread HTML element props anywhere other than the `slots` prop.

As an example, `Input` extends its own special props with these:

```ts
Pick<ComponentPropsWithRef<'input'>, 'onChange' | 'value' | 'defaultValue' | 'disabled' | 'placeholder'>
```

As a consequence, these props are removed from the slot so there is no confusion:
```ts
interface InputSlots {
  //...
  input: Omit<ComponentPropsWithoutRef<'input'>, 'onChange' | 'value' | 'defaultValue' | 'disabled' | 'placeholder'>
  //...
}
```

### Consider the `classes` prop for promoting the `className` prop for each slot

We’ve discussed an alternative approach which gives components two props: `classes` which is `Record<SlotKey, string>`, elevating `className` from plain slots one level, and `slots` as `Record<SlotKey, Omit<ComponentProps<'component'>, 'className'>`.

### Spread slots in the correct order

When rendering an HTML element, ensure properties are spread in this order:
1. Properties that are defaults and can be overridden (e.g. `role`)
2. Slot props
3. `className`, using `mx('your default styles here', slots?.thisSlot?.className)` as the value
4. Handlers, which call handlers from the correct slot if defined.
5. Properties that must not be overridden. (In these cases, it’s also wise to omit the property from the corresponding slot so developers know it’s off-limits.)

e.g.:
```tsx
<div
  role='region'
  {...slots.root}
  className={mx('fixed inset-0', slots.root?.className)}
  onKeyUp={()=>{
    slots.root?.onKeyUp?.();
    exampleKeyUp();
  }}
  aria-labelledby={exampleId}
>
  {children}
</div>
```

