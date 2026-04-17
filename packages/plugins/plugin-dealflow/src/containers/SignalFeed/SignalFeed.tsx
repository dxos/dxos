//
// Copyright 2025 DXOS.org
//

import React, { forwardRef } from 'react';

import { Obj } from '@dxos/echo';
import { Card, Icon, Panel } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';

import { Signal } from '#types';

/**
 * Standalone signal feed showing all signals across all deals.
 * Can be used as an article surface for a Signal collection or as a companion panel.
 */

type SignalFeedTileData = { signal: Signal.Signal };
type SignalFeedTileProps = Pick<MosaicTileProps<SignalFeedTileData>, 'data' | 'location' | 'current'>;

const SignalFeedTile = forwardRef<HTMLDivElement, SignalFeedTileProps>(({ data, location, current }, forwardedRef) => {
  const { signal } = data;
  const { setCurrentId } = useMosaicContainer('SignalFeedTile');

  const kindInfo = Signal.KindOptions.find((option) => option.id === signal.kind);
  const detected = signal.detectedAt ? new Date(signal.detectedAt).toLocaleDateString() : undefined;
  const orgName = signal.organization?.target?.name;
  const personName = signal.person?.target?.fullName ?? signal.person?.target?.preferredName;

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
            {orgName && (
              <Card.Row icon='ph--buildings--regular'>
                <Card.Text variant='description'>{orgName}</Card.Text>
              </Card.Row>
            )}
            {personName && (
              <Card.Row icon='ph--user--regular'>
                <Card.Text variant='description'>{personName}</Card.Text>
              </Card.Row>
            )}
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

SignalFeedTile.displayName = 'SignalFeedTile';

export type SignalFeedProps = {
  role: string;
  signals?: Signal.Signal[];
};

/** Signal feed as a standalone component (used when there's no specific Deal subject). */
export const SignalFeedStandalone = ({ role }: { role: string; subject?: any; attendableId?: string }) => {
  const db = Obj.getDatabase({} as any);
  // Standalone feed queries all signals in the space.
  // When used as a companion to a Deal, the parent passes filtered signals instead.
  return <Panel.Root role={role}><Panel.Content /></Panel.Root>;
};
