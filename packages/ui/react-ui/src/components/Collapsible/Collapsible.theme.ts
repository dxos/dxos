//
// Copyright 2026 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import type { ComponentFunction, Theme } from '@dxos/ui-types';

export type CollapsibleStyleProps = {
  /** The section cannot be folded, so its trigger reads as text rather than a control. */
  disabled?: boolean;
};

const root: ComponentFunction<CollapsibleStyleProps> = (_props, ...etc) => mx(...etc);

/**
 * A heading that folds its section. Left-aligned and full-width so it keeps the box a plain heading
 * had, and inherits its type — the affordance is the pointer and the focus ring, not a button skin.
 */
const trigger: ComponentFunction<CollapsibleStyleProps> = ({ disabled }, ...etc) =>
  mx(
    'text-start w-full min-w-0 font-inherit text-inherit dx-focus-ring-inset rounded-xs',
    disabled ? 'cursor-default' : 'cursor-pointer',
    ...etc,
  );

/**
 * The folded section. The machine measures the content and publishes its height as `--height`, which
 * is what the shared `slide-down`/`slide-up` keyframes run to — so the height is animated rather than
 * transitioned, the only way to move between `0` and a height nothing has declared.
 */
const content: ComponentFunction<CollapsibleStyleProps> = (_props, ...etc) =>
  mx(
    'data-[state=open]:animate-slide-down data-[state=closed]:animate-slide-up',
    // `slide-up` ends at zero but does not hold there, so without `forwards` the box springs back to
    // its full height for the frame between the animation ending and the section unmounting — read
    // as a flinch at the end of every collapse.
    'data-[state=closed]:[animation-fill-mode:forwards]',
    // The animation runs the box between two heights, so anything taller must be clipped for the
    // duration; `overflow` is otherwise the content's own business.
    'data-[state=closed]:overflow-hidden',
    // Rows keep their natural size and the shrinking box clips them, rather than being re-solved
    // against it every frame — the collapse should wipe the section away, not compress it. An `auto`
    // track can be squeezed to its content's automatic minimum, which is ZERO for any row holding an
    // overflow container (a Card, a truncating cell), so those rows close while their neighbours hold
    // and the content visibly slides together. `max-content` pins each row to the height its content
    // takes at the width the columns already resolved; `content-start` then packs them at the top.
    'auto-rows-max content-start',
    ...etc,
  );

export const collapsibleTheme: Theme<CollapsibleStyleProps> = {
  root,
  trigger,
  content,
};
