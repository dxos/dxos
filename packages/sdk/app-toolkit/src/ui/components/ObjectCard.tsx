//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, forwardRef } from 'react';

import { Entity } from '@dxos/echo';
import { useLabel } from '@dxos/react-client/echo';
import * as Card from '@dxos/react-ui/Card';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Util from '@dxos/react-ui/Util';
import { getStyles } from '@dxos/ui-theme';

import { CardIconSlot } from './CardIconSlot.tsx';

const DEFAULT_ICON = 'ph--circle-dashed--regular';

//
// Root
//

type ObjectCardRootProps = Omit<Card.RootProps, 'classNames' | 'grid'>;

/** A grid `Card.Root`, so an object card's header and rows share the card's rails. */
export const ObjectCardRoot = Util.composable<HTMLDivElement, ObjectCardRootProps>((props, forwardedRef) => (
  <Card.Root {...props} grid ref={forwardedRef} />
));

ObjectCardRoot.displayName = 'ObjectCard.Root';

//
// Header
//

type ObjectCardHeaderProps = {
  /** The object being depicted; its type's icon (and hue) and label make the header. */
  subject: unknown;
  /** Overrides the type's icon. */
  icon?: string;
  /** Overrides the object's label. */
  children?: ReactNode;
  /** Clamps the title to this many lines; without it the title is one line, truncated. */
  lines?: Card.TitleProps['lines'];
  /** Rendered after the title, in the end rail (e.g., a `Card.Menu` or a `Block rail='end'`). */
  menu?: ReactNode;
};

/** The object's icon (overridable by a `CardIcon` contribution), its title, and an optional menu. */
export const ObjectCardHeader = forwardRef<HTMLDivElement, ObjectCardHeaderProps>(
  ({ subject, icon: iconProp, children, lines, menu }, forwardedRef) => {
    const entity = Entity.isEntity(subject) || Entity.isSnapshot(subject) ? subject : undefined;
    const iconAnnotation = entity && Entity.getIcon(entity);
    const icon = iconProp ?? iconAnnotation?.icon ?? DEFAULT_ICON;
    const iconStyles = iconAnnotation?.hue ? getStyles(iconAnnotation.hue) : undefined;
    const label = useLabel(entity, { fallback: 'typename' });

    return (
      <Card.Header ref={forwardedRef}>
        <Layout.Block>
          <CardIconSlot subject={subject}>
            <Icon.Icon icon={icon} classNames={iconStyles?.text} />
          </CardIconSlot>
        </Layout.Block>
        <Card.Title truncate={lines === undefined} lines={lines}>
          {children ?? label}
        </Card.Title>
        {menu}
      </Card.Header>
    );
  },
);

ObjectCardHeader.displayName = 'ObjectCard.Header';

//
// ObjectCard
//

/** An ECHO object as a card: a grid `Card.Root` and a header depicting the object. */
export const ObjectCard = {
  Root: ObjectCardRoot,
  Header: ObjectCardHeader,
};

export type { ObjectCardHeaderProps, ObjectCardRootProps };
