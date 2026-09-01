//
// Copyright 2022 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type ComponentPropsWithRef, type CSSProperties, type PropsWithChildren, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useId } from '@dxos/react-hooks';
import { type Elevation, type MessageValence, type SlottableProps } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { useElevationContext, useThemeContext } from '../../hooks/index.ts';
import { type ThemedClassName } from '../../util/index.ts';
import { IconButton } from '../Button/index.ts';
import { Column } from '../Column/index.ts';
import { Icon } from '../Icon/index.ts';

const bannerIcons: Record<MessageValence, string> = {
  success: 'ph--check-circle--duotone',
  info: 'ph--info--duotone',
  warning: 'ph--warning--duotone',
  error: 'ph--warning-circle--duotone',
  neutral: 'ph--info--duotone',
};

type BannerRootProps = PropsWithChildren<{
  valence?: MessageValence;
  titleId?: string;
  descriptionId?: string;
  /** Overrides the default valence icon; consumed by {@link BannerTitle}. */
  icon?: string;
}>;

type MessageContextValue = { titleId?: string; descriptionId: string; valence: MessageValence; icon?: string };

const BANNER_NAME = 'Banner';

// CSS custom properties for valence color inheritance — consumed by Button variant='valence'.
// Extending CSSProperties so entries satisfy the style prop type without a cast at the use site.
type ValenceCSSVars = CSSProperties & {
  '--dx-valence-bg': string;
  '--dx-valence-bg-hover': string;
  '--dx-valence-text': string;
};

const valenceVars: Record<MessageValence, ValenceCSSVars> = {
  success: {
    '--dx-valence-bg': 'var(--color-success-bg)',
    '--dx-valence-bg-hover': 'var(--color-success-bg-hover)',
    '--dx-valence-text': 'var(--color-success-text)',
  },
  info: {
    '--dx-valence-bg': 'var(--color-info-bg)',
    '--dx-valence-bg-hover': 'var(--color-info-bg-hover)',
    '--dx-valence-text': 'var(--color-info-text)',
  },
  warning: {
    '--dx-valence-bg': 'var(--color-warning-bg)',
    '--dx-valence-bg-hover': 'var(--color-warning-bg-hover)',
    '--dx-valence-text': 'var(--color-warning-text)',
  },
  error: {
    '--dx-valence-bg': 'var(--color-error-bg)',
    '--dx-valence-bg-hover': 'var(--color-error-bg-hover)',
    '--dx-valence-text': 'var(--color-error-text)',
  },
  neutral: {
    '--dx-valence-bg': 'var(--color-neutral-bg)',
    '--dx-valence-bg-hover': 'var(--color-neutral-bg-hover)',
    '--dx-valence-text': 'var(--color-neutral-text)',
  },
};

const [MessageProvider, useMessageContext] = createContext<MessageContextValue>(BANNER_NAME);

//
// Root
//

/**
 * Headless: renders no DOM element — only the shared message context (ids, valence, icon).
 * The element, with its role/aria wiring, valence CSS variables and surface, is `Banner.Content`.
 */
const BannerRoot = ({
  valence = 'neutral',
  titleId: propsTitleId,
  descriptionId: propsDescriptionId,
  icon,
  children,
}: BannerRootProps) => {
  const titleId = useId('message__title', propsTitleId);
  const descriptionId = useId('message__description', propsDescriptionId);

  return <MessageProvider {...{ titleId, descriptionId, valence, icon }}>{children}</MessageProvider>;
};

BannerRoot.displayName = BANNER_NAME;

//
// Content
//

const BANNER_CONTENT_NAME = 'Banner.Content';

// Narrowed to the composable surface because the element is a `Column.Root`, which only accepts
// `classNames`/`role`/`style` (see `ComposableProps`).
type BannerContentProps = SlottableProps<{ elevation?: Elevation }>;

/**
 * The message's element: a `Column` grid carrying the role/aria wiring, the valence CSS variables
 * and surface — so `Banner.Title` places its icon in the gutter and `Banner.Body` aligns to the
 * content track. Required inside `Banner.Root`, which renders no DOM element.
 */
const BannerContent = forwardRef<HTMLDivElement, BannerContentProps>(
  ({ asChild, classNames, role, style, children, elevation: propsElevation, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { titleId, descriptionId, valence } = useMessageContext(BANNER_CONTENT_NAME);
    const elevation = useElevationContext(propsElevation);
    // Spread rather than inline attributes: `Column.Root`'s composable surface does not declare
    // aria props, and assignability (unlike JSX literal attributes) admits them.
    const aria = { 'aria-labelledby': titleId, 'aria-describedby': descriptionId };

    return (
      <Column.Root
        asChild={asChild}
        {...props}
        {...aria}
        role={role ?? (valence === 'neutral' ? 'paragraph' : 'alert')}
        style={{ ...valenceVars[valence], ...style }}
        classNames={tx('banner.content', { valence, elevation }, classNames)}
        ref={forwardedRef}
      >
        {children}
      </Column.Root>
    );
  },
);

BannerContent.displayName = BANNER_CONTENT_NAME;

//
// Title
//

const BANNER_TITLE_NAME = 'Banner.Title';

type BannerTitleProps = Omit<ThemedClassName<ComponentPropsWithRef<typeof Primitive.h2>>, 'id'> & {
  icon?: string;
  onClose?: () => void;
};

const BannerTitle = forwardRef<HTMLDivElement, BannerTitleProps>(
  ({ classNames, children, icon: iconProp, onClose }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const { tx } = useThemeContext();
    const { titleId, valence, icon: contextIcon } = useMessageContext(BANNER_TITLE_NAME);
    const icon = iconProp ?? contextIcon ?? bannerIcons[valence];
    return (
      <Column.Row classNames={tx('banner.header', {}, classNames)} ref={forwardedRef}>
        {icon && (
          <Column.Block>
            <Icon icon={icon} />
          </Column.Block>
        )}
        <h2 className={tx('banner.title', {}, classNames)} id={titleId}>
          {children}
        </h2>
        {onClose && (
          <Column.Block end>
            <IconButton
              variant='ghost'
              icon='ph--x--regular'
              iconOnly
              density='sm'
              label={t('toolbar-close.label')}
              onClick={onClose}
            />
          </Column.Block>
        )}
      </Column.Row>
    );
  },
);

BannerTitle.displayName = BANNER_TITLE_NAME;

//
// Body
//

const BANNER_BODY_NAME = 'Banner.Body';

type BannerBodyProps = Omit<ThemedClassName<ComponentPropsWithRef<typeof Primitive.h2>>, 'id'> & {
  asChild?: boolean;
};

const BannerBody = forwardRef<HTMLParagraphElement, BannerBodyProps>(
  ({ asChild, classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { descriptionId } = useMessageContext(BANNER_BODY_NAME);
    const Comp = asChild ? Slot : Primitive.p;
    return (
      <Comp {...props} className={tx('banner.body', {}, classNames)} id={descriptionId} ref={forwardedRef}>
        {children}
      </Comp>
    );
  },
);

BannerBody.displayName = BANNER_BODY_NAME;

//
// Banner
//

export const Banner = {
  Root: BannerRoot,
  Content: BannerContent,
  Title: BannerTitle,
  Body: BannerBody,
};

export type { BannerBodyProps, BannerContentProps, BannerRootProps, BannerTitleProps };
