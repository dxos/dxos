//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { ark } from '@ark-ui/react/factory';
import React, { type ReactNode, useId } from 'react';
import { useTranslation } from 'react-i18next';

import { createContext } from '@dxos/react-hooks';
import { type MessageValence } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { composable, composableProps, slottable } from '../../../util/slots.ts';
import { recipes } from '../../recipes.ts';
import * as Block from '../Block/Block.tsx';
import * as Button from '../Button/Button.tsx';
import * as Container from '../Container/Container.tsx';
import * as Icon from '../Icon/Icon.tsx';
import * as Typography from '../Typography/Typography.tsx';

const BANNER_ICONS: Record<MessageValence, string> = {
  success: 'ph--check-circle--duotone',
  info: 'ph--info--duotone',
  warning: 'ph--warning--duotone',
  error: 'ph--warning-circle--duotone',
  neutral: 'ph--info--duotone',
};

type BannerContextValue = { titleId: string; descriptionId: string; valence: MessageValence; icon?: string };

const [BannerProvider, useBannerContext] = createContext<BannerContextValue>('Banner');

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
    const inset = !Container.useInGrid();
    const { style, ...attributes } = Container.containerAttributes({ gutter: 'rail' });
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
          <Container.DefaultGutterProvider gutter={undefined}>{children}</Container.DefaultGutterProvider>
        </BannerProvider>
      </div>
    );
  },
);

BannerRoot.displayName = 'Banner.Root';

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
    const { titleId, valence, icon: rootIcon } = useBannerContext('Banner.Title');
    const icon = iconProp ?? rootIcon ?? BANNER_ICONS[valence];
    const { style, ...attributes } = Container.containerAttributes({ layout: 'row' });
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
        <Block.Block rail='start'>
          <Icon.Icon icon={icon} />
        </Block.Block>
        <Typography.Text asChild>
          <h2 id={titleId}>{children}</h2>
        </Typography.Text>
        {onClose && (
          <Block.Block rail='end'>
            <Button.Button
              icon='ph--x--regular'
              label={t('toolbar-close.label')}
              iconOnly
              variant='ghost'
              onClick={onClose}
            />
          </Block.Block>
        )}
      </div>
    );
  },
);

BannerTitle.displayName = 'Banner.Title';

//
// Body
//

const BannerBody = slottable<HTMLParagraphElement>(({ children, asChild, ...props }, forwardedRef) => {
  const { descriptionId } = useBannerContext('Banner.Body');
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

BannerBody.displayName = 'Banner.Body';
export type { BannerRootProps as RootProps, BannerTitleProps as TitleProps };

export { BannerBody as Body, BannerRoot as Root, BannerTitle as Title };
