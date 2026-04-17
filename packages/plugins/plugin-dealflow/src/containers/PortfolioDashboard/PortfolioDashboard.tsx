//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { Card, Icon, Panel, ScrollArea } from '@dxos/react-ui';

import { Dashboard, Deal, Signal } from '#types';

export type PortfolioDashboardProps = {
  role: string;
  subject: Dashboard.Dashboard;
  attendableId?: string;
};

/** Group deals by stage and count them. */
const useStageCounts = (deals: Deal.Deal[]) => {
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const deal of deals) {
      const stage = deal.stage ?? 'unknown';
      counts.set(stage, (counts.get(stage) ?? 0) + 1);
    }
    return Deal.StageOptions.map((option) => ({
      ...option,
      count: counts.get(option.id) ?? 0,
    }));
  }, [deals]);
};

/** Get recent signals sorted by date. */
const useRecentSignals = (signals: Signal.Signal[], limit = 15) => {
  return useMemo(
    () => [...signals]
      .sort((signalA, signalB) => (signalB.detectedAt ?? '').localeCompare(signalA.detectedAt ?? ''))
      .slice(0, limit),
    [signals, limit],
  );
};

/** Get deals with recent activity. */
const useActiveDeals = (deals: Deal.Deal[], limit = 10) => {
  return useMemo(
    () => [...deals]
      .filter((deal) => deal.stage !== 'passed' && deal.stage !== 'closed')
      .sort((dealA, dealB) => (dealB.lastActivity ?? '').localeCompare(dealA.lastActivity ?? ''))
      .slice(0, limit),
    [deals, limit],
  );
};

const stageColorMap: Record<string, string> = {
  sourcing: 'bg-neutral-200',
  screening: 'bg-indigo-200',
  diligence: 'bg-purple-200',
  termsheet: 'bg-amber-200',
  closed: 'bg-emerald-200',
  passed: 'bg-red-200',
};

const signalKindIcon: Record<string, string> = {
  funding: 'ph--currency-dollar--regular',
  hire: 'ph--user-plus--regular',
  launch: 'ph--rocket--regular',
  paper: 'ph--article--regular',
  social: 'ph--chat-circle--regular',
  code: 'ph--git-branch--regular',
  token: 'ph--coins--regular',
  news: 'ph--newspaper--regular',
};

export const PortfolioDashboard = ({ role, subject: dashboard }: PortfolioDashboardProps) => {
  const db = Obj.getDatabase(dashboard);
  const deals: Deal.Deal[] = useQuery(db, Filter.type(Deal.Deal));
  const signals: Signal.Signal[] = useQuery(db, Filter.type(Signal.Signal));

  const stageCounts = useStageCounts(deals);
  const recentSignals = useRecentSignals(signals);
  const activeDeals = useActiveDeals(deals);

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar>
        <span className='flex items-center gap-2 px-2 font-medium'>
          <Icon icon='ph--chart-pie-slice--regular' size={5} />
          {dashboard.name ?? 'Portfolio Dashboard'}
        </span>
      </Panel.Toolbar>
      <Panel.Content>
        <ScrollArea.Root orientation='vertical' padding centered>
          <ScrollArea.Viewport>
            <div className='p-4 space-y-6'>
              {/* Pipeline Summary. */}
              <section>
                <h2 className='text-lg font-semibold mb-3'>Pipeline Summary</h2>
                <div className='grid grid-cols-3 gap-3 sm:grid-cols-6'>
                  {stageCounts.map((stage) => (
                    <div key={stage.id} className='rounded-lg border p-3 text-center'>
                      <div className={`inline-block rounded-full px-2 py-0.5 text-xs mb-1 ${stageColorMap[stage.id] ?? 'bg-neutral-100'}`}>
                        {stage.title}
                      </div>
                      <div className='text-2xl font-bold'>{stage.count}</div>
                    </div>
                  ))}
                </div>
                <div className='mt-2 text-sm text-description'>
                  {deals.length} total deals
                </div>
              </section>

              {/* Active Deals. */}
              <section>
                <h2 className='text-lg font-semibold mb-3'>Active Deals</h2>
                <div className='space-y-2'>
                  {activeDeals.map((deal) => (
                    <Card.Root key={deal.id}>
                      <Card.Toolbar>
                        <Card.IconBlock>
                          <Card.Icon icon='ph--handshake--regular' />
                        </Card.IconBlock>
                        <Card.Text classNames='truncate font-medium'>{deal.name ?? 'Unnamed'}</Card.Text>
                        <div className={`rounded-full px-2 py-0.5 text-xs ${stageColorMap[deal.stage ?? ''] ?? 'bg-neutral-100'}`}>
                          {deal.stage ?? 'unknown'}
                        </div>
                      </Card.Toolbar>
                      <Card.Content>
                        <div className='flex gap-4 text-sm text-description'>
                          {deal.organization?.target?.name && (
                            <span>{deal.organization.target.name}</span>
                          )}
                          {deal.round && <span>{deal.round}</span>}
                          {deal.askAmount && <span>${(deal.askAmount / 1_000_000).toFixed(1)}M ask</span>}
                          {deal.lastActivity && (
                            <span>Last: {new Date(deal.lastActivity).toLocaleDateString()}</span>
                          )}
                        </div>
                      </Card.Content>
                    </Card.Root>
                  ))}
                  {activeDeals.length === 0 && (
                    <p className='text-sm text-description'>No active deals.</p>
                  )}
                </div>
              </section>

              {/* Recent Signals. */}
              <section>
                <h2 className='text-lg font-semibold mb-3'>Recent Signals</h2>
                <div className='space-y-2'>
                  {recentSignals.map((signal, index) => (
                    <div key={index} className='flex items-start gap-3 rounded-lg border p-3'>
                      <Icon
                        icon={signalKindIcon[signal.kind ?? ''] ?? 'ph--lightning--regular'}
                        size={5}
                        classNames='mt-0.5 shrink-0'
                      />
                      <div className='min-w-0 flex-1'>
                        <div className='font-medium text-sm truncate'>{signal.title}</div>
                        <div className='flex gap-3 text-xs text-description mt-0.5'>
                          {signal.source && <span>{signal.source}</span>}
                          {signal.deal?.target?.name && (
                            <span className='truncate'>{signal.deal.target.name}</span>
                          )}
                          {signal.detectedAt && (
                            <span>{new Date(signal.detectedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                        {signal.description && (
                          <p className='text-xs text-description mt-1 line-clamp-2'>{signal.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {recentSignals.length === 0 && (
                    <p className='text-sm text-description'>No recent signals.</p>
                  )}
                </div>
              </section>
            </div>
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};
