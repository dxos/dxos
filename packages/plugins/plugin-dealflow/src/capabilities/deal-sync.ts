//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { type Space, SpaceState } from '@dxos/client/echo';
import { Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client/types';
import { Organization } from '@dxos/types';

import { Deal } from '#types';

/** Stage mapping from Trello list names to deal stages. */
const LIST_TO_STAGE: Record<string, string> = {
  interesting: 'sourcing',
  researching: 'screening',
  invested: 'closed',
  input: 'sourcing',
  passed: 'passed',
};

/** Normalize a list name to a deal stage. */
const listNameToStage = (listName: string): string => {
  const normalized = listName.toLowerCase().trim();
  for (const [key, stage] of Object.entries(LIST_TO_STAGE)) {
    if (normalized.includes(key)) {
      return stage;
    }
  }
  return 'sourcing';
};

/**
 * Sync module that bridges TrelloCards to Deal objects.
 * Runs at startup and periodically checks for unlinked TrelloCards.
 */
export default Capability.makeModule(() =>
  Effect.gen(function* () {
    const capabilities = yield* Capability.Service;

    // Poll for clients to become available.
    const checkAndBridge = async () => {
      try {
        const clients = capabilities.getAll(ClientCapabilities.Client);
        if (clients.length === 0) {
          return;
        }

        const client = clients[0];
        const spaces = client.spaces.get();

        for (const space of spaces) {
          if (space.state.get() !== SpaceState.SPACE_READY) {
            continue;
          }

          await bridgeInSpace(space);
        }
      } catch (error) {
        log.catch(error);
      }
    };

    // Run after a delay to let data load.
    const timerId = setTimeout(checkAndBridge, 5000);

    return Capability.contributes(AppCapabilities.Schema, []);
  }),
);

/** Bridge TrelloCards to Deals in a single space. */
const bridgeInSpace = async (space: Space) => {
  const db = space.db;

  // Find TrelloCards by querying for the typename.
  const trelloCards = await db.query(Filter.typename('org.dxos.type.trelloCard')).run();
  if (trelloCards.length === 0) {
    return;
  }

  // Query existing deals.
  const existingDeals = await db.query(Filter.type(Deal.Deal)).run() as Deal.Deal[];
  const dealsByTrelloId = new Map(
    existingDeals
      .filter((deal) => deal.trelloCardId)
      .map((deal) => [deal.trelloCardId, deal]),
  );

  // Query existing organizations.
  const existingOrgs = await db.query(Filter.type(Organization.Organization)).run() as Organization.Organization[];
  const orgsByName = new Map(
    existingOrgs
      .filter((org) => org.name)
      .map((org) => [org.name!.toLowerCase(), org]),
  );

  let created = 0;

  for (const card of trelloCards) {
    const trelloCardId = (card as any).trelloCardId;
    const closed = (card as any).closed;
    const cardName = (card as any).name ?? '';
    const listName = (card as any).listName ?? '';
    const description = (card as any).description ?? '';
    const labels = (card as any).labels ?? [];
    const lastActivityAt = (card as any).lastActivityAt;

    if (closed || !trelloCardId || dealsByTrelloId.has(trelloCardId)) {
      continue;
    }

    const stage = listNameToStage(listName);

    // Find or create Organization.
    const orgKey = cardName.toLowerCase();
    let org = orgsByName.get(orgKey);
    if (!org) {
      org = Obj.make(Organization.Organization, {
        name: cardName,
        status: stage === 'closed' ? 'active' : 'prospect',
      });
      db.add(org);
      orgsByName.set(orgKey, org);
    }

    // Create Deal.
    const deal = Deal.make({
      name: cardName,
      organization: Ref.make(org),
      stage,
      trelloCardId,
      thesis: description || undefined,
      firstContact: lastActivityAt ?? new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      sectors: labels.map((label: any) => label.name).filter(Boolean),
    });

    db.add(deal);
    dealsByTrelloId.set(trelloCardId, deal);
    created++;
  }

  if (created > 0) {
    log.info('Deal bridge created deals from Trello cards', { count: created });
  }
};
