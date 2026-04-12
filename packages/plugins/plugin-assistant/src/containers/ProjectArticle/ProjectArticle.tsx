//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import React, { forwardRef, useMemo, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { useObjectMenuItems, type AppSurface } from '@dxos/app-toolkit/ui';
import { type Project } from '@dxos/assistant-toolkit';
import { Annotation, Filter, Obj, Query } from '@dxos/echo';
import { AtomObj, AtomRef } from '@dxos/echo-atom';
import { useQuery } from '@dxos/react-client/echo';
import { Card, Message, Panel, ScrollArea, Toolbar, useTranslation } from '@dxos/react-ui';
import { Menu } from '@dxos/react-ui-menu';
import { Focus, Mosaic, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { isNonNullable } from '@dxos/util';

import { meta } from '#meta';

export type ProjectArticleProps = AppSurface.ObjectArticleProps<Project.Project>;

export const ProjectArticle = ({ role, subject: project }: ProjectArticleProps) => {
  const { t } = useTranslation(meta.id);
  const [viewport, setViewport] = useState<HTMLElement | null>(null);

  const inputQueue = useAtomValue(
    AtomObj.make(project).pipe((_) =>
      Atom.make((get) =>
        Option.fromNullable(get(_).queue).pipe(Option.map(AtomRef.make), Option.map(get), Option.getOrUndefined),
      ),
    ),
  );

  const inputQueueObjects = useQuery(inputQueue, Query.select(Filter.everything()));

  const artifacts = useAtomValue(
    useMemo(
      () =>
        AtomObj.make(project).pipe((project) =>
          Atom.make((get) => {
            return get(project).artifacts.map((artifact) => get(AtomRef.make(artifact.data)));
          }),
        ),
      [project],
    ),
  );

  const objects = [...artifacts, ...inputQueueObjects].filter(isNonNullable);

  return (
    <Panel.Root role={role} className='dx-document'>
      <Panel.Toolbar />
      <Panel.Content>
        {objects.length === 0 && (
          <Message.Root classNames='m-2' valence='info'>
            <Message.Title>{t('project-empty-spec.message')}</Message.Title>
          </Message.Root>
        )}

        {/* TODO(burdon): Use masonry? */}
        <Mosaic.Container asChild withFocus autoScroll={viewport}>
          <ScrollArea.Root orientation='vertical'>
            <ScrollArea.Viewport ref={setViewport}>
              <Mosaic.Stack Tile={StackTile} items={objects} getId={(item) => item.id} draggable={false} />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Mosaic.Container>
      </Panel.Content>
    </Panel.Root>
  );
};

const StackTile = forwardRef<HTMLDivElement, MosaicTileProps<Obj.Unknown>>(
  ({ data, location, debug }, forwardedRef) => {
    const objectMenuItems = useObjectMenuItems(data);
    const icon = Function.pipe(
      Obj.getSchema(data),
      Option.fromNullable,
      Option.flatMap(Annotation.IconAnnotation.get),
      Option.map(({ icon }) => icon),
      Option.getOrElse(() => 'ph--placeholder--regular'),
    );

    return (
      <Menu.Root>
        <Mosaic.Tile asChild id={data.id} data={data} location={location} debug={debug}>
          <Focus.Item asChild>
            <Card.Root ref={forwardedRef} data-testid='board-item'>
              <Card.Toolbar>
                <Card.IconBlock padding>
                  <Card.Icon icon={icon} />
                </Card.IconBlock>
                <Card.Title>{Obj.getLabel(data)}</Card.Title>
                {/* TODO(wittjosiah): Reconcile with Card.Menu. */}
                <Card.IconBlock padding>
                  <Menu.Trigger asChild disabled={!objectMenuItems?.length}>
                    <Toolbar.IconButton
                      iconOnly
                      variant='ghost'
                      icon='ph--dots-three-vertical--regular'
                      label='Actions'
                    />
                  </Menu.Trigger>
                  <Menu.Content items={objectMenuItems} />
                </Card.IconBlock>
              </Card.Toolbar>
              <Card.Content>
                <Surface.Surface
                  role='card--content'
                  limit={1}
                  data={{ subject: data } satisfies AppSurface.ObjectCardData}
                />
              </Card.Content>
            </Card.Root>
          </Focus.Item>
        </Mosaic.Tile>
      </Menu.Root>
    );
  },
);

StackTile.displayName = 'StackTile';
