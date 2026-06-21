//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { JsonView, PanelContainer } from '@dxos/devtools';
import { Format } from '@dxos/echo/Format';
import { Button, Input, Toolbar } from '@dxos/react-ui';
import { DynamicTable, type TablePropertyDefinition, type TableRowAction } from '@dxos/react-ui-table';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { withRegistry } from '@dxos/storybook-utils';

import { translations } from '#translations';

import {
  ACCOUNT_PROPERTIES,
  CODE_ACTIONS,
  CODE_PROPERTIES,
  DOMAIN_PROPERTIES,
  GRANT_ACTIONS,
  IDENTITY_BULK_ACTIONS,
  IDENTITY_PROPERTIES,
  IDENTITY_ROW_ACTIONS,
  INSPECT_ACTION,
  MAGIC_LINK_PROPERTIES,
  MESSAGE_PROPERTIES,
  PAGE_PROPERTIES,
  ROUTE_PROPERTIES,
  SCRIPT_PROPERTIES,
  SPACE_BULK_ACTIONS,
  SPACE_PROPERTIES,
  SPACE_ROW_ACTIONS,
  WAITLIST_ACTIONS,
  WAITLIST_PROPERTIES,
} from './HubAdminPanels';

const DID = 'did:halo:BJZYS2AQ8a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6';

//
// Mock data
//

const mockAccounts = [
  {
    id: '1',
    createdAt: '2026-06-20T17:40:00Z',
    email: 'test@dxos.org',
    emailVerified: true,
    invitationsRemaining: 3,
    identityDid: DID,
  },
  {
    id: '2',
    createdAt: '2026-06-18T09:10:00Z',
    email: 'alice@example.com',
    emailVerified: false,
    invitationsRemaining: 0,
    identityDid: DID,
  },
];
const mockCodes = [
  {
    id: 'ABC123',
    createdAt: '2026-06-19T12:00:00Z',
    code: 'ABC123',
    note: 'q3-bonus',
    issuedByIdentityDid: DID,
    redeemedByIdentityDid: undefined,
    revokedAt: undefined,
  },
  {
    id: 'XYZ789',
    createdAt: '2026-06-10T08:00:00Z',
    code: 'XYZ789',
    note: undefined,
    issuedByIdentityDid: undefined,
    redeemedByIdentityDid: DID,
    revokedAt: '2026-06-12T08:00:00Z',
  },
];
const mockWaitlist = [
  {
    id: '1',
    created: '2026-06-20T10:00:00Z',
    email: 'pending@example.com',
    name: 'Pat Pending',
    status: 'pending',
    identityDid: DID,
  },
  {
    id: '2',
    created: '2026-06-15T10:00:00Z',
    email: 'invited@example.com',
    name: 'Iris Invited',
    status: 'invited',
    identityDid: undefined,
  },
];
const mockMagicLinks = [
  {
    id: 't1',
    expiresAt: '2026-06-21T10:00:00Z',
    email: 'login@example.com',
    type: 'login',
    link: 'https://hub.dxos.org/account/activate/t1',
  },
];
const mockMessages = [
  {
    id: '1',
    created: '2026-06-20T10:00:00Z',
    from: 'no-reply@dxos.network',
    to: 'hello@dxos.network',
    subject: 'Welcome',
    status: 'sent',
  },
];
const mockPages = [
  {
    id: 'composer',
    name: 'composer',
    subdomain: 'composer.pages.dev',
    domains: 'composer.space',
    deployment: 'dep_abc',
    deployedAt: '2026-06-19T00:00:00Z',
  },
];
const mockScripts = [{ id: 'edge', created_on: '2026-01-01T00:00:00Z', modified_on: '2026-06-19T00:00:00Z' }];
const mockDomains = [
  { id: 'd1', zone_name: 'dxos.org', hostname: 'edge.dxos.org', service: 'edge', environment: 'production' },
];
const mockRoutes = [
  { id: '1', method: 'GET', path: '/api/admin/accounts' },
  { id: '2', method: 'POST', path: '/api/admin/email' },
];
const mockSpaces = [
  {
    id: 'S1',
    spaceId: 'S1ABCDEF',
    status: 'active',
    identityKey: DID,
    createdAt: '2026-06-01T00:00:00Z',
    lastActivity: '2026-06-20T00:00:00Z',
    totalEvents: 1234,
  },
];
const mockIdentities = [
  { id: 'I1', identityKey: DID, haloSpaceId: 'H1ABCDEF', createdAt: '2026-06-01T00:00:00Z', hasRecovery: true },
];
const mockInstances = [{ id: 'do-1', name: 'RouterObject' }];

//
// Presentational table frame (mirrors the panel's PanelContainer + DynamicTable shape).
//

const TablePanel = ({
  name,
  properties,
  rows,
  rowActions,
  bulkActions,
  toolbarExtra,
}: {
  name: string;
  properties: TablePropertyDefinition[];
  rows: any[];
  rowActions?: TableRowAction[];
  bulkActions?: TableRowAction[];
  toolbarExtra?: React.ReactNode;
}) => (
  <PanelContainer
    toolbar={
      <Toolbar.Root>
        <Button>Reload</Button>
        {toolbarExtra}
      </Toolbar.Root>
    }
  >
    <DynamicTable
      name={name}
      properties={properties}
      rows={rows}
      rowActions={rowActions}
      bulkActions={bulkActions}
      // eslint-disable-next-line no-console
      onRowAction={(action, row) => console.log('row action', action, row)}
      // eslint-disable-next-line no-console
      onBulkAction={(action, selected) => console.log('bulk action', action, selected)}
    />
  </PanelContainer>
);

const meta = {
  title: 'plugins/plugin-debug/HubAdminPanels',
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withRegistry],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const Accounts: Story = {
  render: () => (
    <TablePanel
      name='story.accounts'
      properties={ACCOUNT_PROPERTIES}
      rows={mockAccounts}
      rowActions={GRANT_ACTIONS}
      bulkActions={GRANT_ACTIONS}
    />
  ),
};

export const Codes: Story = {
  render: () => (
    <TablePanel
      name='story.codes'
      properties={CODE_PROPERTIES}
      rows={mockCodes}
      rowActions={CODE_ACTIONS}
      bulkActions={CODE_ACTIONS}
      toolbarExtra={<Button>Create</Button>}
    />
  ),
};

export const Waitlist: Story = {
  render: () => (
    <TablePanel
      name='story.waitlist'
      properties={WAITLIST_PROPERTIES}
      rows={mockWaitlist}
      rowActions={WAITLIST_ACTIONS}
      bulkActions={WAITLIST_ACTIONS}
    />
  ),
};

export const MagicLinks: Story = {
  render: () => <TablePanel name='story.magicLinks' properties={MAGIC_LINK_PROPERTIES} rows={mockMagicLinks} />,
};

export const Messages: Story = {
  render: () => <TablePanel name='story.messages' properties={MESSAGE_PROPERTIES} rows={mockMessages} />,
};

export const Routes: Story = {
  render: () => <TablePanel name='story.routes' properties={ROUTE_PROPERTIES} rows={mockRoutes} />,
};

export const Spaces: Story = {
  render: () => (
    <TablePanel
      name='story.spaces'
      properties={SPACE_PROPERTIES}
      rows={mockSpaces}
      rowActions={SPACE_ROW_ACTIONS}
      bulkActions={SPACE_BULK_ACTIONS}
    />
  ),
};

export const Identities: Story = {
  render: () => (
    <TablePanel
      name='story.identities'
      properties={IDENTITY_PROPERTIES}
      rows={mockIdentities}
      rowActions={IDENTITY_ROW_ACTIONS}
      bulkActions={IDENTITY_BULK_ACTIONS}
    />
  ),
};

export const Services: Story = {
  render: () => (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <Button>Reload</Button>
        </Toolbar.Root>
      }
    >
      <div className='p-2 space-y-4'>
        <div className='space-y-1'>
          <p className='text-sm font-medium'>Pages</p>
          <DynamicTable name='story.services.pages' properties={PAGE_PROPERTIES} rows={mockPages} />
        </div>
        <div className='space-y-1'>
          <p className='text-sm font-medium'>Worker Scripts</p>
          <DynamicTable name='story.services.scripts' properties={SCRIPT_PROPERTIES} rows={mockScripts} />
        </div>
        <div className='space-y-1'>
          <p className='text-sm font-medium'>Worker Domains</p>
          <DynamicTable name='story.services.domains' properties={DOMAIN_PROPERTIES} rows={mockDomains} />
        </div>
      </div>
    </PanelContainer>
  ),
};

export const SendEmail: Story = {
  render: () => {
    const [form, setForm] = useState({
      from: 'no-reply@dxos.network',
      to: 'hello@dxos.network',
      subject: 'Test',
      body: 'Hello',
    });
    return (
      <PanelContainer>
        <div className='p-4 space-y-2 max-w-lg'>
          <Input.Root>
            <Input.Label>From</Input.Label>
            <Input.TextInput
              value={form.from}
              onChange={(event) => setForm((f) => ({ ...f, from: event.target.value }))}
            />
          </Input.Root>
          <Input.Root>
            <Input.Label>To</Input.Label>
            <Input.TextInput value={form.to} onChange={(event) => setForm((f) => ({ ...f, to: event.target.value }))} />
          </Input.Root>
          <Input.Root>
            <Input.Label>Subject</Input.Label>
            <Input.TextInput
              value={form.subject}
              onChange={(event) => setForm((f) => ({ ...f, subject: event.target.value }))}
            />
          </Input.Root>
          <Input.Root>
            <Input.Label>Body</Input.Label>
            <Input.TextArea
              rows={10}
              value={form.body}
              onChange={(event) => setForm((f) => ({ ...f, body: event.target.value }))}
            />
          </Input.Root>
          <Button>Send</Button>
        </div>
      </PanelContainer>
    );
  },
};

export const Templates: Story = {
  render: () => (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <Button>Reload</Button>
        </Toolbar.Root>
      }
    >
      <div className='p-2 space-y-3'>
        <div className='space-y-1'>
          <p className='text-sm font-medium'>email</p>
          <div className='flex flex-wrap gap-1'>
            <Button>invitationCode</Button>
            <Button>accountApproved</Button>
          </div>
        </div>
        <div className='space-y-2'>
          <p className='text-sm font-medium'>email/invitationCode</p>
          <iframe
            title='preview'
            srcDoc='<h1>You are invited</h1><p>Redeem your code.</p>'
            className='w-full h-64 border border-separator rounded'
            sandbox='allow-same-origin'
          />
        </div>
      </div>
    </PanelContainer>
  ),
};

export const Diagnostics: Story = {
  render: () => (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <Button>Run DB integrity check</Button>
          <Button>Sync Ghost</Button>
          <Button>Sync Kit</Button>
        </Toolbar.Root>
      }
    >
      <div className='p-2'>
        <JsonView data={{ ok: true, checked: 42, issues: [] }} />
      </div>
    </PanelContainer>
  ),
};

export const EdgeBindings: Story = {
  render: () => (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <Button>Reload</Button>
        </Toolbar.Root>
      }
    >
      <div className='p-2 space-y-4'>
        <div>
          <p className='text-sm font-medium mb-2'>Durable Object Types</p>
          <div className='flex flex-wrap gap-1'>
            <Button variant='primary'>RouterObject (3)</Button>
            <Button variant='default'>SpaceObject (12)</Button>
          </div>
        </div>
        <div className='space-y-1'>
          <p className='text-sm font-medium'>Instances: RouterObject</p>
          <DynamicTable
            name='story.edge.instances'
            properties={[{ name: 'id', format: Format.TypeFormat.DID }]}
            rows={mockInstances}
            rowActions={INSPECT_ACTION}
          />
        </div>
      </div>
    </PanelContainer>
  ),
};

export const DangerZone: Story = {
  render: () => (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <Button>Dry run</Button>
          <Button>Confirm purge</Button>
        </Toolbar.Root>
      }
    >
      <div className='p-4 space-y-2'>
        <p className='text-sm font-medium text-error'>Selective Storage Purge</p>
        <p className='text-sm text-description'>
          Dry-run first to preview what will be purged, then confirm to execute.
        </p>
        <JsonView data={{ dryRun: true, expectedKeepDids: [DID], orphanedObjects: 17 }} />
      </div>
    </PanelContainer>
  ),
};
