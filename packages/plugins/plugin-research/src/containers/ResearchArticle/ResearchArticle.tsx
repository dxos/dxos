//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { getObjectPathFromObject, LayoutOperation } from '@dxos/app-toolkit';
import { Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Markdown } from '@dxos/plugin-markdown/types';
import { useQuery } from '@dxos/react-client/echo';
import { Card, Panel, ScrollArea, Toolbar } from '@dxos/react-ui';
import { Focus, Mosaic, type MosaicTileProps, useMosaicContainer } from '@dxos/react-ui-mosaic';
import { Organization } from '@dxos/types';

import { Research } from '#types';

const SEMANTIC_SCHOLAR_BASE = '/api/scholar';
const ARCHIVE_ORG_BASE = '/api/archive';

export type ResearchArticleProps = {
  role: string;
  subject: Research.ResearchAccount;
  attendableId?: string;
};

type ScholarPaper = {
  paperId: string;
  title: string;
  abstract?: string;
  year?: number;
  citationCount?: number;
  url?: string;
  authors?: { name: string }[];
};

//
// Tile component.
//

type ReportTileData = {
  report: Research.ResearchReport;
  onOpen: (report: Research.ResearchReport) => void;
};

type ReportTileProps = Pick<MosaicTileProps<ReportTileData>, 'data' | 'location' | 'current'>;

const ReportTile = forwardRef<HTMLDivElement, ReportTileProps>(({ data, location, current }, forwardedRef) => {
  const { report, onOpen } = data;
  const { setCurrentId } = useMosaicContainer('ReportTile');
  const reportId = report.title ?? 'report';

  return (
    <Mosaic.Tile asChild classNames='dx-hover dx-current' id={reportId} data={data} location={location}>
      <Focus.Item asChild current={current} onCurrentChange={() => setCurrentId(reportId)}>
        <Card.Root ref={forwardedRef} onClick={() => onOpen(report)}>
          <Card.Toolbar>
            <Card.IconBlock>
              <Card.Icon icon='ph--book-open--regular' />
            </Card.IconBlock>
            <Card.Text classNames='truncate'>{report.title ?? 'Untitled Report'}</Card.Text>
          </Card.Toolbar>
          <Card.Content>
            {report.kind && (
              <Card.Row icon='ph--tag--regular'>
                <Card.Text variant='description'>{report.kind}</Card.Text>
              </Card.Row>
            )}
            {report.query && (
              <Card.Row icon='ph--magnifying-glass--regular'>
                <Card.Text variant='description'>Query: {report.query}</Card.Text>
              </Card.Row>
            )}
            <Card.Row icon='ph--files--regular'>
              <Card.Text variant='description'>{report.sourceCount ?? 0} sources</Card.Text>
            </Card.Row>
            {report.createdAt && (
              <Card.Row icon='ph--clock--regular'>
                <Card.Text variant='description'>{new Date(report.createdAt).toLocaleString()}</Card.Text>
              </Card.Row>
            )}
          </Card.Content>
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
});

ReportTile.displayName = 'ReportTile';

//
// Main article component.
//

export const ResearchArticle = ({ role, subject: account }: ResearchArticleProps) => {
  const db = Obj.getDatabase(account);
  const reports: Research.ResearchReport[] = useQuery(db, Filter.type(Research.ResearchReport));
  const orgs: Organization.Organization[] = useQuery(db, Filter.type(Organization.Organization));
  const [searching, setSearching] = useState(false);
  const [reportViewport, setReportViewport] = useState<HTMLElement | null>(null);
  const { invokePromise } = useOperationInvoker();

  const handleOpenReport = useCallback(
    (report: Research.ResearchReport) => {
      const doc = report.document?.target;
      if (!doc) {
        return;
      }
      const docPath = getObjectPathFromObject(doc);
      void invokePromise(LayoutOperation.Open, { subject: [docPath] });
    },
    [invokePromise],
  );

  /** Search Semantic Scholar for papers related to organizations in the workspace. */
  const handleSearchPapers = useCallback(async () => {
    if (!db || orgs.length === 0) {
      return;
    }

    setSearching(true);
    try {
      for (const org of orgs) {
        const orgName = org.name;
        if (!orgName) {
          continue;
        }

        const query = encodeURIComponent(orgName);
        const headers: Record<string, string> = {};
        if (account.semanticScholarKey) {
          headers['x-api-key'] = account.semanticScholarKey;
        }

        try {
          const response = await fetch(
            `${SEMANTIC_SCHOLAR_BASE}/graph/v1/paper/search?query=${query}&limit=10&fields=title,abstract,year,citationCount,url,authors`,
            { headers },
          );

          if (!response.ok) {
            log.warn('Semantic Scholar search failed', { status: response.status, orgName });
            continue;
          }

          const data = await response.json();
          const papers = (data.data ?? []) as ScholarPaper[];

          if (papers.length === 0) {
            continue;
          }

          // Build a research report document.
          const sections: string[] = [
            `# Research: ${orgName}`,
            '',
            `**Search query:** "${orgName}"`,
            `**Date:** ${new Date().toLocaleString()}`,
            `**Papers found:** ${papers.length}`,
            '',
            '## Academic Papers',
            '',
          ];

          for (const paper of papers) {
            const authors = paper.authors?.map((author) => author.name).join(', ') ?? 'Unknown';
            sections.push(`### ${paper.title}`);
            sections.push(`**Authors:** ${authors}`);
            if (paper.year) {
              sections.push(`**Year:** ${paper.year}`);
            }
            if (paper.citationCount !== undefined) {
              sections.push(`**Citations:** ${paper.citationCount}`);
            }
            if (paper.url) {
              sections.push(`**URL:** ${paper.url}`);
            }
            if (paper.abstract) {
              sections.push('', paper.abstract);
            }
            sections.push('');
          }

          const content = sections.join('\n');
          const docName = `Research: ${orgName} — ${new Date().toLocaleDateString()}`;
          const doc = Markdown.make({ name: docName, content });
          db.add(doc);

          const report = Obj.make(Research.ResearchReport, {
            title: docName,
            document: Ref.make(doc),
            organization: Ref.make(org),
            kind: 'paper-search',
            query: orgName,
            sourceCount: papers.length,
            createdAt: new Date().toISOString(),
          });
          db.add(report);
        } catch (error) {
          log.warn('Failed to search papers for org', { orgName, error });
        }
      }

      Obj.change(account, (mutable) => {
        mutable.lastSearchedAt = new Date().toISOString();
      });
    } catch (error) {
      log.catch(error);
    } finally {
      setSearching(false);
    }
  }, [db, account, orgs]);

  /** Search archive.org for historical web snapshots of organizations in the workspace. */
  const handleSearchArchive = useCallback(async () => {
    if (!db || orgs.length === 0) {
      return;
    }

    setSearching(true);
    try {
      for (const org of orgs) {
        const website = org.website;
        if (!website) {
          continue;
        }

        const domain = website.replace(/^https?:\/\//, '').replace(/\/$/, '');

        try {
          const response = await fetch(
            `${ARCHIVE_ORG_BASE}/__wb/sparkline?output=json&url=${encodeURIComponent(domain)}&collection=web`,
          );

          if (!response.ok) {
            continue;
          }

          const data = await response.json();
          const years = Object.keys(data.years ?? {}).sort();

          if (years.length === 0) {
            continue;
          }

          const sections: string[] = [
            `# Web Archive: ${domain}`,
            '',
            `**Domain:** ${domain}`,
            `**Date:** ${new Date().toLocaleString()}`,
            `**Archive years:** ${years[0]} — ${years[years.length - 1]}`,
            '',
            '## Snapshot Timeline',
            '',
          ];

          for (const year of years) {
            const captures = data.years[year]?.reduce((sum: number, count: number) => sum + count, 0) ?? 0;
            sections.push(`- **${year}:** ${captures} captures — [View](https://web.archive.org/web/${year}*/${domain})`);
          }

          sections.push('');

          const content = sections.join('\n');
          const docName = `Archive: ${domain}`;
          const doc = Markdown.make({ name: docName, content });
          db.add(doc);

          const report = Obj.make(Research.ResearchReport, {
            title: docName,
            document: Ref.make(doc),
            organization: Ref.make(org),
            kind: 'web-archive',
            query: domain,
            sourceCount: years.length,
            createdAt: new Date().toISOString(),
          });
          db.add(report);
        } catch (error) {
          log.warn('Failed to search archive for domain', { domain, error });
        }
      }
    } catch (error) {
      log.catch(error);
    } finally {
      setSearching(false);
    }
  }, [db, orgs]);

  const sortedReports = useMemo(
    () =>
      [...reports].sort((reportA, reportB) => (reportB.createdAt ?? '').localeCompare(reportA.createdAt ?? '')),
    [reports],
  );

  const reportItems = useMemo(
    () => sortedReports.map((report) => ({ report, onOpen: handleOpenReport })),
    [sortedReports, handleOpenReport],
  );

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Text>{account.name ?? 'Research'}</Toolbar.Text>
          <Toolbar.Separator />
          <Toolbar.IconButton
            label={searching ? 'Searching...' : 'Search papers'}
            icon='ph--article--regular'
            iconOnly
            disabled={searching || orgs.length === 0}
            onClick={handleSearchPapers}
          />
          <Toolbar.IconButton
            label={searching ? 'Searching...' : 'Search archives'}
            icon='ph--archive--regular'
            iconOnly
            disabled={searching || orgs.length === 0}
            onClick={handleSearchArchive}
          />
          {account.lastSearchedAt && (
            <>
              <Toolbar.Separator />
              <Toolbar.Text>{new Date(account.lastSearchedAt).toLocaleTimeString()}</Toolbar.Text>
            </>
          )}
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <Focus.Group asChild>
          <Mosaic.Container asChild withFocus autoScroll={reportViewport}>
            <ScrollArea.Root orientation='vertical' padding centered>
              <ScrollArea.Viewport ref={setReportViewport}>
                <Mosaic.VirtualStack
                  Tile={ReportTile}
                  classNames='my-2'
                  gap={8}
                  items={reportItems}
                  draggable={false}
                  getId={(item) => item.report.title ?? 'report'}
                  getScrollElement={() => reportViewport}
                  estimateSize={() => 140}
                />
              </ScrollArea.Viewport>
            </ScrollArea.Root>
          </Mosaic.Container>
        </Focus.Group>
      </Panel.Content>
    </Panel.Root>
  );
};
