//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { Person } from '@dxos/types';

import { Signal } from '#types';

import { EnrichDeal } from './definitions';

const HARMONIC_API_BASE = '/api/harmonic';

/**
 * Enriches a deal with company data from the Harmonic API.
 * Updates the Organization with company details and creates Person objects for founders.
 */
const handler: Operation.WithHandler<typeof EnrichDeal> = EnrichDeal.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ deal: dealRef, companyDomain }) {
      const deal = yield* Database.load(dealRef);
      const db = Obj.getDatabase(deal);
      if (!db) {
        return { enriched: false, signalsCreated: 0 };
      }

      const org = deal.organization?.target;
      const domain = companyDomain ?? org?.website;
      if (!domain) {
        return { enriched: false, signalsCreated: 0 };
      }

      // Get Harmonic API key from localStorage.
      const apiKey = typeof globalThis.localStorage !== 'undefined'
        ? globalThis.localStorage.getItem('HARMONIC_API_KEY')
        : null;

      if (!apiKey) {
        log.warn('HARMONIC_API_KEY not set in localStorage');
        return { enriched: false, signalsCreated: 0 };
      }

      let signalsCreated = 0;
      let companyName: string | undefined;
      let fundingTotal: string | undefined;
      let teamSize: number | undefined;

      try {
        // Search for company by domain.
        const searchResponse = yield* Effect.promise(() =>
          fetch(`${HARMONIC_API_BASE}/companies/search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ domain: domain.replace(/^https?:\/\//, '') }),
          }),
        );

        if (!searchResponse.ok) {
          log.warn('Harmonic company search failed', { status: searchResponse.status });
          return { enriched: false, signalsCreated: 0 };
        }

        const companyData = yield* Effect.promise(() => searchResponse.json());

        if (companyData) {
          companyName = companyData.name;

          // Update organization with enrichment data.
          if (org) {
            Obj.change(org, (mutable) => {
              if (companyData.description && !mutable.description) {
                mutable.description = companyData.description;
              }
              if (companyData.website && !mutable.website) {
                mutable.website = companyData.website;
              }
            });
          }

          // Process funding rounds.
          if (companyData.funding_rounds?.length > 0) {
            let totalFunding = 0;
            for (const round of companyData.funding_rounds) {
              totalFunding += round.amount ?? 0;

              const signal = Obj.make(Signal.Signal, {
                title: `${round.series ?? 'Funding'}: $${((round.amount ?? 0) / 1_000_000).toFixed(1)}M`,
                description: `${companyName} raised $${((round.amount ?? 0) / 1_000_000).toFixed(1)}M in ${round.series ?? 'unknown round'}`,
                kind: 'funding',
                source: 'harmonic',
                deal: Ref.make(deal),
                organization: org ? Ref.make(org) : undefined,
                detectedAt: round.date ?? new Date().toISOString(),
                data: { investors: round.investors?.join(', ') ?? '' },
              });
              db.add(signal);
              signalsCreated++;
            }
            fundingTotal = `$${(totalFunding / 1_000_000).toFixed(1)}M`;
          }

          // Process team members — create Person objects for founders/executives.
          if (companyData.team?.length > 0) {
            teamSize = companyData.team.length;
            const existingPersons = yield* Effect.promise(() => db.query(Filter.type(Person.Person)).run());
            const existingEmails = new Set(
              existingPersons.flatMap((person) => (person.emails ?? []).map((entry) => entry.value?.toLowerCase())),
            );

            for (const member of companyData.team) {
              if (!member.email || existingEmails.has(member.email.toLowerCase())) {
                continue;
              }

              const person = Obj.make(Person.Person, {
                fullName: member.name,
                jobTitle: member.title,
                emails: [{ label: 'work', value: member.email }],
                organization: org ? Ref.make(org) : undefined,
              });
              db.add(person);

              if (member.title?.match(/founder|ceo|cto|coo|president/i)) {
                const signal = Obj.make(Signal.Signal, {
                  title: `Key person: ${member.name} (${member.title})`,
                  kind: 'hire',
                  source: 'harmonic',
                  deal: Ref.make(deal),
                  person: Ref.make(person),
                  detectedAt: new Date().toISOString(),
                });
                db.add(signal);
                signalsCreated++;
              }
            }
          }
        }
      } catch (error) {
        log.catch(error);
        return { enriched: false, signalsCreated: 0 };
      }

      return {
        enriched: true,
        companyName,
        fundingTotal,
        teamSize,
        signalsCreated,
      };
    }),
  ),
);

export default handler;
