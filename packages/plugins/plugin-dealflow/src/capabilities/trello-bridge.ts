//
// Copyright 2025 DXOS.org
//


import { Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
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
 * Bridge TrelloCards to Deal objects.
 * Call this after a Trello sync to auto-create/update Deals from cards.
 */
export const bridgeTrelloCardsToDeal = (db: any, trelloCards: any[]): void => {
  if (!db) {
    return;
  }

  try {
    // Query existing deals to avoid duplicates.
    const existingDeals = db.query(Filter.type(Deal.Deal)).objects as Deal.Deal[];
    const dealsByTrelloId = new Map(
      existingDeals
        .filter((deal: Deal.Deal) => deal.trelloCardId)
        .map((deal: Deal.Deal) => [deal.trelloCardId, deal]),
    );

    // Query existing organizations.
    const existingOrgs = db.query(Filter.type(Organization.Organization)).objects as Organization.Organization[];
    const orgsByName = new Map(
      existingOrgs
        .filter((org: Organization.Organization) => org.name)
        .map((org: Organization.Organization) => [org.name!.toLowerCase(), org]),
    );

    for (const card of trelloCards) {
      if (card.closed) {
        continue;
      }

      const existingDeal = dealsByTrelloId.get(card.trelloCardId);
      const stage = listNameToStage(card.listName ?? '');

      if (existingDeal) {
        // Update existing deal stage from Trello list.
        if (existingDeal.stage !== stage) {
          Obj.change(existingDeal, (mutable) => {
            mutable.stage = stage;
            mutable.lastActivity = new Date().toISOString();
          });
        }
        continue;
      }

      // Find or create Organization for this card.
      const cardName = card.name ?? '';
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

      // Create Deal linked to the Organization and TrelloCard.
      const deal = Deal.make({
        name: cardName,
        organization: Ref.make(org),
        stage,
        trelloCardId: card.trelloCardId,
        thesis: card.description ?? undefined,
        firstContact: card.lastActivityAt ?? new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      });

      // Extract sector tags from Trello labels.
      if (card.labels && card.labels.length > 0) {
        Obj.change(deal, (mutable) => {
          mutable.sectors = card.labels.map((label: any) => label.name).filter(Boolean);
        });
      }

      db.add(deal);
    }
  } catch (error) {
    log.catch(error);
  }
};
