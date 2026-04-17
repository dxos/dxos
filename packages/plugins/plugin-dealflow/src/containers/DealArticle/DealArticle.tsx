//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useMemo, useState } from 'react';

import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { Card, Icon, Panel, ScrollArea, Toolbar } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';

import { Deal, Signal } from '#types';

export type DealArticleProps = {
  role: string;
  subject: Deal.Deal;
  attendableId?: string;
};

//
// Signal tile for the deal timeline.
//

type SignalTileData = { signal: Signal.Signal };
type SignalTileProps = Pick<MosaicTileProps<SignalTileData>, 'data' | 'location' | 'current'>;

const SignalTile = forwardRef<HTMLDivElement, SignalTileProps>(({ data, location, current }, forwardedRef) => {
  const { signal } = data;
  const { setCurrentId } = useMosaicContainer('SignalTile');

  const kindInfo = Signal.KindOptions.find((option) => option.id === signal.kind);
  const detected = signal.detectedAt ? new Date(signal.detectedAt).toLocaleDateString() : undefined;

  return (
    <Mosaic.Tile asChild classNames='dx-hover dx-current' id={signal.id} data={data} location={location}>
      <Focus.Item asChild current={current} onCurrentChange={() => setCurrentId(signal.id)}>
        <Card.Root ref={forwardedRef}>
          <Card.Toolbar>
            <Card.IconBlock>
              <Card.Icon icon={kindInfo?.icon ?? 'ph--lightning--regular'} />
            </Card.IconBlock>
            <Card.Text classNames='truncate'>{signal.title}</Card.Text>
            {signal.url && (
              <Card.IconBlock>
                <a href={signal.url} target='_blank' rel='noreferrer' className='shrink-0'>
                  <Icon icon='ph--arrow-square-out--regular' size={4} />
                </a>
              </Card.IconBlock>
            )}
          </Card.Toolbar>
          <Card.Content>
            {signal.source && (
              <Card.Row icon='ph--plugs--regular'>
                <Card.Text variant='description'>{signal.source}</Card.Text>
              </Card.Row>
            )}
            {signal.description && (
              <Card.Row>
                <Card.Text variant='description' classNames='line-clamp-2'>{signal.description}</Card.Text>
              </Card.Row>
            )}
            {detected && (
              <Card.Row icon='ph--clock--regular'>
                <Card.Text variant='description'>{detected}</Card.Text>
              </Card.Row>
            )}
          </Card.Content>
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
});

SignalTile.displayName = 'SignalTile';

//
// Main deal article.
//

export const DealArticle = ({ role, subject: deal }: DealArticleProps) => {
  const db = Obj.getDatabase(deal);
  const allSignals: Signal.Signal[] = useQuery(db, Filter.type(Signal.Signal));
  const dealSignals = useMemo(
    () => allSignals
      .filter((signal) => signal.deal?.target?.id === deal.id)
      .sort((signalA, signalB) => {
        const dateA = signalA.detectedAt ? new Date(signalA.detectedAt).getTime() : 0;
        const dateB = signalB.detectedAt ? new Date(signalB.detectedAt).getTime() : 0;
        return dateB - dateA;
      }),
    [allSignals, deal.id],
  );

  const [viewport, setViewport] = useState<HTMLElement | null>(null);

  const signalItems = useMemo(
    () => dealSignals.map((signal) => ({ signal })),
    [dealSignals],
  );

  const org = deal.organization?.target;
  const lead = deal.lead?.target;
  const stageInfo = Deal.StageOptions.find((option) => option.id === deal.stage);
  const roundInfo = Deal.RoundOptions.find((option) => option.id === deal.round);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>{deal.name ?? 'Untitled Deal'}</Toolbar.Text>
          {stageInfo && (
            <>
              <Toolbar.Separator />
              <Toolbar.Text>{stageInfo.title}</Toolbar.Text>
            </>
          )}
          {roundInfo && (
            <>
              <Toolbar.Separator />
              <Toolbar.Text>{roundInfo.title}</Toolbar.Text>
            </>
          )}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        {/* Deal summary card. */}
        <div className='p-4'>
          <Card.Root>
            <Card.Content>
              {org && (
                <Card.Row icon='ph--buildings--regular'>
                  <Card.Text>{org.name ?? 'Unknown Company'}</Card.Text>
                </Card.Row>
              )}
              {lead && (
                <Card.Row icon='ph--user--regular'>
                  <Card.Text variant='description'>Lead: {lead.fullName ?? lead.preferredName ?? 'Unassigned'}</Card.Text>
                </Card.Row>
              )}
              {deal.askAmount && (
                <Card.Row icon='ph--currency-dollar--regular'>
                  <Card.Text variant='description'>Ask: ${(deal.askAmount / 1_000_000).toFixed(1)}M</Card.Text>
                </Card.Row>
              )}
              {deal.valuation && (
                <Card.Row icon='ph--chart-line-up--regular'>
                  <Card.Text variant='description'>Valuation: ${(deal.valuation / 1_000_000).toFixed(1)}M</Card.Text>
                </Card.Row>
              )}
              {deal.sectors && deal.sectors.length > 0 && (
                <Card.Row icon='ph--tag--regular'>
                  <Card.Text variant='description'>{deal.sectors.join(', ')}</Card.Text>
                </Card.Row>
              )}
              {deal.thesis && (
                <Card.Row icon='ph--note--regular'>
                  <Card.Text variant='description' classNames='line-clamp-3'>{deal.thesis}</Card.Text>
                </Card.Row>
              )}
            </Card.Content>
          </Card.Root>
        </div>

        {/* Signal timeline. */}
        {signalItems.length > 0 && (
          <Focus.Group asChild>
            <Mosaic.Container asChild withFocus autoScroll={viewport}>
              <ScrollArea.Root orientation='vertical' padding centered>
                <ScrollArea.Viewport ref={setViewport}>
                  <Mosaic.VirtualStack
                    Tile={SignalTile}
                    classNames='my-2'
                    gap={8}
                    items={signalItems}
                    draggable={false}
                    getId={(item) => item.signal.id}
                    getScrollElement={() => viewport}
                    estimateSize={() => 100}
                  />
                </ScrollArea.Viewport>
              </ScrollArea.Root>
            </Mosaic.Container>
          </Focus.Group>
        )}

        {dealSignals.length === 0 && (
          <div className='p-4 text-center text-sm text-description'>
            No signals yet. Signals will appear here as data sources detect relevant events.
          </div>
        )}
      </Panel.Content>
    </Panel.Root>
  );
};
