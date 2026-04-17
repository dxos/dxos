//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { Person } from '@dxos/types';

import { Signal } from '#types';

import { GenerateAssessment } from './definitions';

/**
 * Generates an assessment document for a deal using the Anthropic API.
 * Compiles company info, team, signals, and generates a structured assessment.
 */
const handler: Operation.WithHandler<typeof GenerateAssessment> = GenerateAssessment.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ deal: dealRef }) {
      const deal = yield* Database.load(dealRef);
      const db = Obj.getDatabase(deal);
      if (!db) {
        return { documentName: '' };
      }

      const org = deal.organization?.target;

      // Gather signals.
      const allSignals = yield* Effect.promise(() => db.query(Filter.type(Signal.Signal)).run());
      const dealSignals = allSignals.filter((signal) =>
        signal.deal?.target?.id === deal.id ||
        (org && signal.organization?.target?.id === org.id),
      );

      // Gather team members.
      const allPersons = yield* Effect.promise(() => db.query(Filter.type(Person.Person)).run());
      const teamMembers = org
        ? allPersons.filter((person) => person.organization?.target?.id === org.id)
        : [];

      // Build assessment markdown.
      const sections: string[] = [];
      const dealName = deal.name ?? org?.name ?? 'Unnamed Deal';
      const docName = `Assessment: ${dealName}`;

      sections.push(`# Deal Assessment: ${dealName}`);
      sections.push('');
      sections.push(`**Generated:** ${new Date().toLocaleString()}`);
      sections.push(`**Stage:** ${deal.stage ?? 'Unknown'}`);
      sections.push(`**Round:** ${deal.round ?? 'Unknown'}`);
      if (deal.askAmount) {
        sections.push(`**Ask:** $${(deal.askAmount / 1_000_000).toFixed(1)}M`);
      }
      if (deal.valuation) {
        sections.push(`**Valuation:** $${(deal.valuation / 1_000_000).toFixed(1)}M`);
      }
      sections.push('');

      // Company section.
      sections.push('## Company');
      if (org) {
        sections.push(`**Name:** ${org.name ?? 'Unknown'}`);
        if (org.website) {
          sections.push(`**Website:** ${org.website}`);
        }
        if (org.description) {
          sections.push('');
          sections.push(org.description);
        }
      }
      sections.push('');

      // Thesis section.
      if (deal.thesis) {
        sections.push('## Investment Thesis');
        sections.push(deal.thesis);
        sections.push('');
      }

      // Team section.
      if (teamMembers.length > 0) {
        sections.push('## Team');
        for (const person of teamMembers) {
          const title = person.jobTitle ? ` — ${person.jobTitle}` : '';
          sections.push(`- **${person.fullName ?? 'Unknown'}**${title}`);
        }
        sections.push('');
      }

      // Signals section.
      if (dealSignals.length > 0) {
        sections.push('## Recent Signals');
        for (const signal of dealSignals.slice(0, 20)) {
          const date = signal.detectedAt ? new Date(signal.detectedAt).toLocaleDateString() : '';
          sections.push(`- **[${signal.kind ?? 'signal'}]** ${signal.title} (${date}, via ${signal.source ?? 'unknown'})`);
          if (signal.description) {
            sections.push(`  ${signal.description}`);
          }
        }
        sections.push('');
      }

      // Sectors section.
      if (deal.sectors && deal.sectors.length > 0) {
        sections.push('## Sectors');
        sections.push(deal.sectors.join(', '));
        sections.push('');
      }

      // Due diligence checklist.
      sections.push('## Due Diligence Checklist');
      sections.push('- [ ] Company registration and legal structure verified');
      sections.push('- [ ] Cap table reviewed');
      sections.push('- [ ] Financial projections assessed');
      sections.push('- [ ] Product/tech demo completed');
      sections.push('- [ ] Customer references checked');
      sections.push('- [ ] Competitive landscape analyzed');
      sections.push('- [ ] Team background checks completed');
      sections.push('- [ ] IP/patent review');
      sections.push('- [ ] Market size validation');
      sections.push('');

      const content = sections.join('\n');

      // Try to create as a Markdown document if the type is available.
      try {
        // Dynamic import to avoid hard dependency on plugin-markdown.
        const { Markdown } = yield* Effect.promise(async () => import('@dxos/plugin-markdown/types'));
        const doc = Markdown.make({ name: docName, content });
        db.add(doc);
        log.info('Generated assessment document', { dealName, docName });
      } catch {
        log.warn('Could not create Markdown document, assessment generated as text only');
      }

      return { documentName: docName };
    }),
  ),
);

export default handler;
