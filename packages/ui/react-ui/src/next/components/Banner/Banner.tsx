//
// Copyright 2026 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React, { type ReactNode, useId } from 'react';
import { useTranslation } from 'react-i18next';

import { createContext } from '@dxos/react-hooks';
import { type MessageValence } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { composable, composableProps, slottable } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { Block } from '../Block/index.ts';
import { Button } from '../Button/index.ts';
import { DefaultGutterProvider, containerAttributes, useInGrid } from '../Container/index.ts';
import { Icon } from '../Icon/index.ts';
import { Typography } from '../Typography/index.ts';

const BANNER_ICONS: Record<MessageValence, string> = {
  success: 'ph--check-circle--duotone',
  info: 'ph--info--duotone',
  warning: 'ph--warning--duotone',
  error: 'ph--warning-circle--duotone',
  neutral: 'ph--info--duotone',
};

type BannerContextValue = { titleId: string; descriptionId: string; valence: MessageValence; icon?: string };

const [BannerProvider, useBannerContext] = createContext<BannerContextValue>('Next.Banner');

//
// Root
//

type BannerRootProps = {
  valence?: MessageValence;
  /** Overrides the valence's icon in the Title's start rail. */
  icon?: string;
};

/**
 * A message on its valence's surface: a rail-gutter Container whose Title puts the icon in the start rail and an
 * optional close button in the end rail, so the Body aligns with the title text. A neutral banner is a note,
 * any other an alert. Buttons with `variant='valence'` inside it take its colours.
 */
const BannerRoot = composable<HTMLDivElement, BannerRootProps>(
  ({ children, valence = 'neutral', icon, ...props }, forwardedRef) => {
    const titleId = useId();
    const descriptionId = useId();
    // Outside a Container (a pane's body) there is no gutter to sit in, so the banner insets itself as a form's would be.
    const inset = !useInGrid();
    const { style, ...attributes } = containerAttributes({ gutter: 'rail' });
    const {
      className,
      style: propsStyle,
      ...rest
    } = composableProps<HTMLDivElement>(props, {
      classNames: [recipes.container(), recipes.banner()],
      role: valence === 'neutral' ? 'note' : 'alert',
    });
    return (
      <div
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        {...rest}
        {...attributes}
        data-scope='banner'
        data-part='root'
        data-valence={valence}
        data-inset={inset ? '' : undefined}
        style={{ ...style, ...propsStyle }}
        className={className}
        ref={forwardedRef}
      >
        <BannerProvider titleId={titleId} descriptionId={descriptionId} valence={valence} icon={icon}>
          <DefaultGutterProvider gutter={undefined}>{children}</DefaultGutterProvider>
        </BannerProvider>
      </div>
    );
  },
);

BannerRoot.displayName = 'Next.Banner.Root';

//
// Title
//

type BannerTitleProps = {
  /** Overrides the Root's icon for this title. */
  icon?: string;
  /** Shows a close button in the end rail. */
  onClose?: () => void;
  children?: ReactNode;
};

const BannerTitle = composable<HTMLDivElement, BannerTitleProps>(
  ({ children, icon: iconProp, onClose, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const { titleId, valence, icon: rootIcon } = useBannerContext('Next.Banner.Title');
    const icon = iconProp ?? rootIcon ?? BANNER_ICONS[valence];
    const { style, ...attributes } = containerAttributes({ layout: 'row' });
    const {
      className,
      style: propsStyle,
      ...rest
    } = composableProps<HTMLDivElement>(props, {
      classNames: [recipes.container(), recipes.bannerTitle()],
    });
    return (
      <div
        {...rest}
        {...attributes}
        data-scope='banner'
        data-part='title'
        style={{ ...style, ...propsStyle }}
        className={className}
        ref={forwardedRef}
      >
        <Block rail='start'>
          <Icon icon={icon} />
        </Block>
        <Typography asChild>
          <h2 id={titleId}>{children}</h2>
        </Typography>
        {onClose && (
          <Block rail='end'>
            <Button icon='ph--x--regular' label={t('toolbar-close.label')} iconOnly variant='ghost' onClick={onClose} />
          </Block>
        )}
      </div>
    );
  },
);

BannerTitle.displayName = 'Next.Banner.Title';

//
// Body
//

const BannerBody = slottable<HTMLParagraphElement>(({ children, asChild, ...props }, forwardedRef) => {
  const { descriptionId } = useBannerContext('Next.Banner.Body');
  const { className, ...rest } = composableProps(props, {
    classNames: [recipes.typography(), recipes.bannerBody()],
  });
  return (
    <ark.p
      asChild={asChild}
      {...rest}
      id={descriptionId}
      data-scope='banner'
      data-part='body'
      className={className}
      ref={forwardedRef}
    >
      {children}
    </ark.p>
  );
});

BannerBody.displayName = 'Next.Banner.Body';

export const Banner = {
  Root: BannerRoot,
  Title: BannerTitle,
  Body: BannerBody,
};

export type { BannerRootProps, BannerTitleProps };
