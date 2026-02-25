//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import * as Option from 'effect/Option';
import React, { forwardRef, useMemo, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { type Initiative, InitiativeFunctions } from '@dxos/assistant-toolkit';
import { DXN, Filter, Obj, Query, Ref } from '@dxos/echo';
import { AtomObj, AtomRef } from '@dxos/echo-atom';
import { FunctionDefinition, Trigger } from '@dxos/functions';
import { useQuery } from '@dxos/react-client/echo';
import { ElevationProvider, IconButton, Layout, ScrollArea } from '@dxos/react-ui';
import { Toolbar } from '@dxos/react-ui';
import { Card, Focus, Mosaic, type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { StackItem } from '@dxos/react-ui-stack';
import { isNonNullable } from '@dxos/util';

const TAB_INITATIVE = 'Initiative';
const TAB_CHAT = 'Chat';

export type InitiativeContainerProps = SurfaceComponentProps<Initiative.Initiative>;

// TODO(dmaretskyi): Rename InitaitveArticle.
// TODO(dmaretskyi): Remove Chat and only leave stack. Currently chat companion is struggling with multiple chats associated with an initiative.
export const InitiativeContainer = ({ subject: initiative }: InitiativeContainerProps) => {
  const [selectedTab, setSelectedTab] = useState<string>(TAB_INITATIVE);

  const chat = useAtomValue(
    useMemo(
      () =>
        AtomObj.make(initiative).pipe((initiative) =>
          Atom.make((get) => {
            const chat = get(initiative).chat;
            return chat ? get(AtomRef.make(chat)) : undefined;
          }),
        ),
      [initiative],
    ),
  );

  return (
    <StackItem.Content toolbar>
      <ElevationProvider elevation='positioned'>
        <Toolbar.Root>
          <IconButton
            icon='ph--sparkle--regular'
            label='Initiative'
            variant={selectedTab === TAB_INITATIVE ? 'primary' : 'ghost'}
            onClick={() => setSelectedTab(TAB_INITATIVE)}
          />
          <IconButton
            icon='ph--chat--regular'
            label='Chat'
            variant={selectedTab === TAB_CHAT ? 'primary' : 'ghost'}
            onClick={() => setSelectedTab(TAB_CHAT)}
          />
        </Toolbar.Root>
      </ElevationProvider>
      {selectedTab === TAB_INITATIVE && <InitiativeStack initiative={initiative} />}
      {selectedTab === TAB_CHAT && <Surface.Surface role='article' data={{ subject: chat }} limit={1} />}
    </StackItem.Content>
  );
};

export default InitiativeContainer;

const InitiativeStack = ({ initiative }: { initiative: Initiative.Initiative }) => {
  const inputQueue = useAtomValue(
    AtomObj.make(initiative).pipe((_) =>
      Atom.make((get) =>
        Option.fromNullable(get(_).queue).pipe(Option.map(AtomRef.make), Option.map(get), Option.getOrUndefined),
      ),
    ),
  );

  const inputQueueItems: Obj.Unknown[] = useQuery(inputQueue, Query.select(Filter.everything()));

  const artifacts = useAtomValue(
    useMemo(
      () =>
        AtomObj.make(initiative).pipe((initiative) =>
          Atom.make((get) => {
            return get(initiative).artifacts.map((artifact) => get(AtomRef.make(artifact.data)) as Obj.Unknown);
          }),
        ),
      [initiative],
    ),
  );

  const [viewport, setViewport] = useState<HTMLElement | null>(null);

  const stackObjects = [...artifacts, ...inputQueueItems].filter(isNonNullable);

  return (
    <Layout.Main classNames='overflow-y-auto'>
      {stackObjects.length === 0 && (
        <div className='text-subdued'>
          Initiative has no objects associated with it.
          <br />
          <br />
          To get started:
          <br />- Write the initative spec: what is the goal of the initiative?
          <br />- subscribe initiative to your email.
          <br />- Chat with the agent.
        </div>
      )}

      {stackObjects.length > 0 && (
        <Focus.Group asChild>
          <Mosaic.Container asChild withFocus autoScroll={viewport}>
            <ScrollArea.Root orientation='vertical'>
              <ScrollArea.Viewport classNames='p-2' ref={setViewport}>
                <Mosaic.Stack items={stackObjects} getId={(item) => item.id} draggable={false} Tile={StackTile} />
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Mosaic.Container>
        </Focus.Group>
      )}
    </Layout.Main>
  );
};

const StackTile = forwardRef<HTMLDivElement, MosaicTileProps<Obj.Unknown>>(
  ({ data, location, debug }, forwardedRef) => {
    return (
      <Mosaic.Tile asChild id={data.id} data={data} location={location} debug={debug}>
        <Focus.Group asChild>
          <Card.Root ref={forwardedRef} data-testid='board-item'>
            <Card.Toolbar>
              <Card.IconBlock></Card.IconBlock>
              <Card.Title>{Obj.getLabel(data)}</Card.Title>
              <Card.Menu />
            </Card.Toolbar>
            <Card.Content>
              <Surface.Surface role='card--content' limit={1} data={{ subject: data }} />
            </Card.Content>
          </Card.Root>
        </Focus.Group>
      </Mosaic.Tile>
    );
  },
);
StackTile.displayName = 'StackTile';
