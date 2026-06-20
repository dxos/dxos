//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Context } from '@dxos/context';
import { JsonView, PanelContainer } from '@dxos/devtools';
import { Format } from '@dxos/echo/Format';
import { log } from '@dxos/log';
import { Button, Input, Toolbar, useAsyncEffect } from '@dxos/react-ui';
import { DynamicTable, type TablePropertyDefinition, type TableRowAction } from '@dxos/react-ui-table';

import { useEdgeAdminClient } from '../../hooks';

//
// Presentational helpers
//

const ReloadToolbar = ({ onReload, children }: { onReload: () => void; children?: React.ReactNode }) => (
  <Toolbar.Root>
    <Button onClick={onReload}>Reload</Button>
    {children}
  </Toolbar.Root>
);

const ErrorBanner = ({ error }: { error?: string }) =>
  error ? <div className='p-2 text-sm text-error'>Error: {error}</div> : null;

/** Ensures every row has an `id` (required by the table model for selection). */
const withId = <T extends Record<string, any>>(
  rows: T[],
  key: (row: T, index: number) => string,
): Array<T & { id: string }> => rows.map((row, index) => ({ ...row, id: key(row, index) }));

//
// Accounts panel
//

export const ACCOUNT_PROPERTIES: TablePropertyDefinition[] = [
  { name: 'createdAt', format: Format.TypeFormat.DateTime, title: 'created', size: 160 },
  { name: 'email', format: Format.TypeFormat.String, size: 240 },
  { name: 'emailVerified', format: Format.TypeFormat.Boolean, title: 'verified', size: 80 },
  { name: 'invitationsRemaining', format: Format.TypeFormat.Number, title: 'invites', size: 80 },
  { name: 'identityDid', format: Format.TypeFormat.DID, title: 'identity', size: 200 },
];

export const GRANT_ACTIONS: TableRowAction[] = [{ id: 'grant', label: 'Grant' }];

export const AccountsPanel = () => {
  const clients = useEdgeAdminClient();
  const [data, setData] = useState<any>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh((count) => count + 1), []);

  useAsyncEffect(async () => {
    if (!clients) {
      return;
    }
    setError(undefined);
    try {
      setData(await clients.hub.adminListAccounts(new Context()));
    } catch (err: any) {
      setError(err?.message ?? String(err));
      log.error('admin fetch error', { error: err });
    }
  }, [clients, refresh]);

  const rows = withId<any>(data?.accounts ?? [], (row) => String(row.identityDid ?? ''));

  const grant = useCallback(
    async (identityDids: string[]) => {
      const input = window.prompt('Number of invitations to grant:', '5');
      const count = input ? Number(input) : NaN;
      if (!clients || !Number.isFinite(count) || count <= 0 || identityDids.length === 0) {
        return;
      }
      try {
        for (const identityDid of identityDids) {
          await clients.hub.adminGrantInvitations(new Context(), identityDid, count);
        }
        reload();
      } catch (err: any) {
        alert(`Failed to grant: ${err.message}`);
      }
    },
    [clients, reload],
  );

  return (
    <PanelContainer toolbar={<ReloadToolbar onReload={reload} />}>
      <ErrorBanner error={error} />
      <DynamicTable
        name='org.dxos.hubAdmin.accounts'
        properties={ACCOUNT_PROPERTIES}
        rows={rows}
        rowActions={GRANT_ACTIONS}
        bulkActions={GRANT_ACTIONS}
        onRowAction={(_, row) => grant([String(row.identityDid ?? '')])}
        onBulkAction={(_, selected) => grant(selected.map((row) => String(row.identityDid ?? '')))}
      />
    </PanelContainer>
  );
};

//
// Invitation codes panel
//

export const CODE_PROPERTIES: TablePropertyDefinition[] = [
  { name: 'createdAt', format: Format.TypeFormat.DateTime, title: 'created', size: 160 },
  { name: 'code', format: Format.TypeFormat.String, size: 140 },
  { name: 'note', format: Format.TypeFormat.String, size: 160 },
  { name: 'issuedByIdentityDid', format: Format.TypeFormat.DID, title: 'issued by', size: 180 },
  { name: 'redeemedByIdentityDid', format: Format.TypeFormat.DID, title: 'redeemed by', size: 180 },
  { name: 'revokedAt', format: Format.TypeFormat.DateTime, title: 'revoked', size: 160 },
];

export const CODE_ACTIONS: TableRowAction[] = [
  { id: 'revoke', label: 'Revoke' },
  { id: 'delete', label: 'Delete' },
];

export const CodesPanel = () => {
  const clients = useEdgeAdminClient();
  const [data, setData] = useState<any>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh((count) => count + 1), []);

  useAsyncEffect(async () => {
    if (!clients) {
      return;
    }
    setError(undefined);
    try {
      setData(await clients.hub.adminListInvitationCodes(new Context()));
    } catch (err: any) {
      setError(err?.message ?? String(err));
      log.error('admin fetch error', { error: err });
    }
  }, [clients, refresh]);

  const rows = withId<any>(data?.codes ?? [], (row) => String(row.code ?? ''));

  const handleCreate = useCallback(async () => {
    if (!clients) {
      return;
    }
    const input = window.prompt('Number of codes to create:', '1');
    const count = input ? Number(input) : 1;
    try {
      await clients.hub.adminCreateInvitationCodes(new Context(), { count });
      reload();
    } catch (err: any) {
      alert(`Failed to create: ${err.message}`);
    }
  }, [clients, reload]);

  const apply = useCallback(
    async (action: string, codes: string[]) => {
      if (!clients || codes.length === 0) {
        return;
      }
      const verb = action === 'delete' ? 'delete' : 'revoke';
      if (!window.confirm(`${verb === 'delete' ? 'Permanently delete' : 'Revoke'} ${codes.length} code(s)?`)) {
        return;
      }
      try {
        for (const code of codes) {
          if (action === 'delete') {
            await clients.hub.adminDeleteInvitationCode(new Context(), code);
          } else {
            await clients.hub.adminRevokeInvitationCode(new Context(), code);
          }
        }
        reload();
      } catch (err: any) {
        alert(`Failed: ${err.message}`);
      }
    },
    [clients, reload],
  );

  return (
    <PanelContainer
      toolbar={
        <ReloadToolbar onReload={reload}>
          <Button onClick={handleCreate} disabled={!clients}>
            Create
          </Button>
        </ReloadToolbar>
      }
    >
      <ErrorBanner error={error} />
      <DynamicTable
        name='org.dxos.hubAdmin.codes'
        properties={CODE_PROPERTIES}
        rows={rows}
        rowActions={CODE_ACTIONS}
        bulkActions={CODE_ACTIONS}
        onRowAction={(action, row) => apply(action, [String(row.code ?? '')])}
        onBulkAction={(action, selected) =>
          apply(
            action,
            selected.map((row) => String(row.code ?? '')),
          )
        }
      />
    </PanelContainer>
  );
};

//
// Waitlist panel
//

export const WAITLIST_PROPERTIES: TablePropertyDefinition[] = [
  { name: 'created', format: Format.TypeFormat.DateTime, title: 'created', size: 160 },
  { name: 'email', format: Format.TypeFormat.String, size: 240 },
  { name: 'name', format: Format.TypeFormat.String, size: 160 },
  { name: 'status', format: Format.TypeFormat.String, size: 100 },
  { name: 'identityDid', format: Format.TypeFormat.DID, title: 'identity', size: 200 },
];

export const WAITLIST_ACTIONS: TableRowAction[] = [
  { id: 'approve', label: 'Approve' },
  { id: 'remove', label: 'Remove' },
];

export const WaitlistPanel = () => {
  const clients = useEdgeAdminClient();
  const [data, setData] = useState<any>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh((count) => count + 1), []);

  useAsyncEffect(async () => {
    if (!clients) {
      return;
    }
    setError(undefined);
    try {
      setData(await clients.hub.adminListWaitlist(new Context()));
    } catch (err: any) {
      setError(err?.message ?? String(err));
      log.error('admin fetch error', { error: err });
    }
  }, [clients, refresh]);

  const rows = withId<any>(data?.entries ?? [], (row) => String(row.id ?? ''));

  const apply = useCallback(
    async (action: string, ids: number[]) => {
      if (!clients || ids.length === 0) {
        return;
      }
      if (action === 'remove' && !window.confirm(`Remove ${ids.length} entry(s)?`)) {
        return;
      }
      try {
        for (const id of ids) {
          if (action === 'remove') {
            await clients.hub.adminRemoveWaitlistEntry(new Context(), id);
          } else {
            await clients.hub.adminApproveWaitlistEntry(new Context(), id);
          }
        }
        reload();
      } catch (err: any) {
        alert(`Failed: ${err.message}`);
      }
    },
    [clients, reload],
  );

  return (
    <PanelContainer toolbar={<ReloadToolbar onReload={reload} />}>
      <ErrorBanner error={error} />
      <p className='p-2 text-sm text-description'>
        Entries with an identity key are auto-bound into a new Account (no code, approval email sent). Entries without
        get an invitation code emailed for manual redemption.
      </p>
      <DynamicTable
        name='org.dxos.hubAdmin.waitlist'
        properties={WAITLIST_PROPERTIES}
        rows={rows}
        rowActions={WAITLIST_ACTIONS}
        bulkActions={WAITLIST_ACTIONS}
        onRowAction={(action, row) => apply(action, [Number(row.id)])}
        onBulkAction={(action, selected) =>
          apply(
            action,
            selected.map((row) => Number(row.id)),
          )
        }
      />
    </PanelContainer>
  );
};

//
// Magic links panel
//

export const MAGIC_LINK_PROPERTIES: TablePropertyDefinition[] = [
  { name: 'expiresAt', format: Format.TypeFormat.DateTime, title: 'expiration', size: 160 },
  { name: 'email', format: Format.TypeFormat.String, size: 240 },
  { name: 'type', format: Format.TypeFormat.String, size: 100 },
  { name: 'link', format: Format.TypeFormat.DID, title: 'link', size: 240 },
];

export const MagicLinksPanel = () => {
  const clients = useEdgeAdminClient();
  const [data, setData] = useState<any>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh((count) => count + 1), []);

  useAsyncEffect(async () => {
    if (!clients) {
      return;
    }
    setError(undefined);
    try {
      setData(await clients.hub.adminListMagicLinks(new Context()));
    } catch (err: any) {
      setError(err?.message ?? String(err));
      log.error('admin fetch error', { error: err });
    }
  }, [clients, refresh]);

  const rows = withId<any>(
    (data?.links ?? []).map((link: any) => ({
      ...link,
      expiresAt: link.expiration ? new Date(link.expiration * 1000).toISOString() : undefined,
    })),
    (row) => String(row.token ?? row.link ?? ''),
  );

  return (
    <PanelContainer toolbar={<ReloadToolbar onReload={reload} />}>
      <ErrorBanner error={error} />
      <DynamicTable name='org.dxos.hubAdmin.magicLinks' properties={MAGIC_LINK_PROPERTIES} rows={rows} />
    </PanelContainer>
  );
};

//
// Messages panel
//

export const MESSAGE_PROPERTIES: TablePropertyDefinition[] = [
  { name: 'created', format: Format.TypeFormat.DateTime, title: 'created', size: 160 },
  { name: 'from', format: Format.TypeFormat.String, size: 200 },
  { name: 'to', format: Format.TypeFormat.String, size: 200 },
  { name: 'subject', format: Format.TypeFormat.String, size: 240 },
  { name: 'status', format: Format.TypeFormat.String, size: 100 },
];

export const MessagesPanel = () => {
  const clients = useEdgeAdminClient();
  const [data, setData] = useState<any>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh((count) => count + 1), []);

  useAsyncEffect(async () => {
    if (!clients) {
      return;
    }
    setError(undefined);
    try {
      setData(await clients.hub.adminListMessages(new Context()));
    } catch (err: any) {
      setError(err?.message ?? String(err));
      log.error('admin fetch error', { error: err });
    }
  }, [clients, refresh]);

  const rows = withId<any>(data?.messages ?? [], (row) => String(row.id ?? ''));

  return (
    <PanelContainer toolbar={<ReloadToolbar onReload={reload} />}>
      <ErrorBanner error={error} />
      <DynamicTable name='org.dxos.hubAdmin.messages' properties={MESSAGE_PROPERTIES} rows={rows} />
    </PanelContainer>
  );
};

//
// Email send panel
//

export const EmailPanel = () => {
  const clients = useEdgeAdminClient();
  const [form, setForm] = useState({
    from: 'no-reply@dxos.network',
    to: 'hello@dxos.network',
    subject: 'Test',
    body: 'Hello',
  });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | undefined>(undefined);

  const handleSend = useCallback(async () => {
    if (!clients || !form.from || !form.to || !form.subject) {
      return;
    }
    setSending(true);
    setResult(undefined);
    try {
      await clients.hub.adminSendEmail(new Context(), form);
      setResult('Sent.');
    } catch (err: any) {
      setResult(`Error: ${err.message}`);
    } finally {
      setSending(false);
    }
  }, [clients, form]);

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
        <Button onClick={handleSend} disabled={!clients || sending || !form.from || !form.to || !form.subject}>
          {sending ? 'Sending…' : 'Send'}
        </Button>
        {result && <p className='text-sm text-description'>{result}</p>}
      </div>
    </PanelContainer>
  );
};

//
// Services panel
//

export const PAGE_PROPERTIES: TablePropertyDefinition[] = [
  { name: 'name', format: Format.TypeFormat.String, size: 200 },
  { name: 'subdomain', format: Format.TypeFormat.String, size: 200 },
  { name: 'domains', format: Format.TypeFormat.String, size: 240 },
  { name: 'deployment', format: Format.TypeFormat.String, size: 160 },
  { name: 'deployedAt', format: Format.TypeFormat.DateTime, title: 'deployed', size: 160 },
];
export const SCRIPT_PROPERTIES: TablePropertyDefinition[] = [
  { name: 'id', format: Format.TypeFormat.String, size: 200 },
  { name: 'created_on', format: Format.TypeFormat.DateTime, title: 'created', size: 160 },
  { name: 'modified_on', format: Format.TypeFormat.DateTime, title: 'modified', size: 160 },
];
export const DOMAIN_PROPERTIES: TablePropertyDefinition[] = [
  { name: 'id', format: Format.TypeFormat.String, size: 140 },
  { name: 'zone_name', format: Format.TypeFormat.String, title: 'zone', size: 200 },
  { name: 'hostname', format: Format.TypeFormat.String, size: 200 },
  { name: 'service', format: Format.TypeFormat.String, size: 160 },
  { name: 'environment', format: Format.TypeFormat.String, title: 'env', size: 120 },
];

export const ServicesPanel = () => {
  const clients = useEdgeAdminClient();
  const [data, setData] = useState<any>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh((count) => count + 1), []);

  useAsyncEffect(async () => {
    if (!clients) {
      return;
    }
    setError(undefined);
    try {
      setData(await clients.hub.adminGetServices(new Context()));
    } catch (err: any) {
      setError(err?.message ?? String(err));
      log.error('admin fetch error', { error: err });
    }
  }, [clients, refresh]);

  const pages = withId<any>(
    (data?.pages ?? []).map((page: any) => ({
      name: page.name,
      subdomain: page.subdomain,
      domains: Array.isArray(page.domains) ? page.domains.join(', ') : '',
      deployment: page.latestDeployment?.id,
      deployedAt: page.latestDeployment?.createdOn,
    })),
    (row) => String(row.name ?? ''),
  );
  const scripts = withId<any>(data?.scripts ?? [], (row) => String(row.id ?? ''));
  const domains = withId<any>(data?.domains ?? [], (row) => String(row.id ?? ''));

  return (
    <PanelContainer toolbar={<ReloadToolbar onReload={reload} />}>
      <ErrorBanner error={error} />
      <div className='p-2 space-y-4'>
        <div className='space-y-1'>
          <p className='text-sm font-medium'>Pages</p>
          <DynamicTable name='org.dxos.hubAdmin.servicesPages' properties={PAGE_PROPERTIES} rows={pages} />
        </div>
        <div className='space-y-1'>
          <p className='text-sm font-medium'>Worker Scripts</p>
          <DynamicTable name='org.dxos.hubAdmin.servicesScripts' properties={SCRIPT_PROPERTIES} rows={scripts} />
        </div>
        <div className='space-y-1'>
          <p className='text-sm font-medium'>Worker Domains</p>
          <DynamicTable name='org.dxos.hubAdmin.servicesDomains' properties={DOMAIN_PROPERTIES} rows={domains} />
        </div>
      </div>
    </PanelContainer>
  );
};

//
// Templates panel
//

export const TemplatesPanel = () => {
  const clients = useEdgeAdminClient();
  const [data, setData] = useState<any>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh((count) => count + 1), []);
  const [preview, setPreview] = useState<any>(undefined);

  useAsyncEffect(async () => {
    if (!clients) {
      return;
    }
    setError(undefined);
    try {
      setData(await clients.hub.adminListTemplates(new Context()));
    } catch (err: any) {
      setError(err?.message ?? String(err));
      log.error('admin fetch error', { error: err });
    }
  }, [clients, refresh]);

  const handlePreview = useCallback(
    async (type: string, name: string) => {
      if (!clients) {
        return;
      }
      try {
        setPreview(await clients.hub.adminGetTemplate(new Context(), type, name));
      } catch (err: any) {
        log.error('template preview failed', { error: err });
      }
    },
    [clients],
  );

  const templates: Record<string, string[]> = data?.templates ?? {};

  return (
    <PanelContainer toolbar={<ReloadToolbar onReload={reload} />}>
      <ErrorBanner error={error} />
      <div className='p-2 space-y-3'>
        {Object.entries(templates).map(([type, names]) => (
          <div key={type} className='space-y-1'>
            <p className='text-sm font-medium'>{type}</p>
            <div className='flex flex-wrap gap-1'>
              {names.map((name) => (
                <Button key={name} onClick={() => handlePreview(type, name)}>
                  {name}
                </Button>
              ))}
            </div>
          </div>
        ))}
        {preview && (
          <div className='space-y-2'>
            <p className='text-sm font-medium'>
              {preview.type}/{preview.name}
            </p>
            {preview.rendered && (
              <iframe
                srcDoc={preview.rendered}
                className='w-full h-64 border border-separator rounded'
                sandbox='allow-same-origin'
              />
            )}
          </div>
        )}
      </div>
    </PanelContainer>
  );
};

//
// Diagnostics panel
//

export const DiagnosticsAdminPanel = () => {
  const clients = useEdgeAdminClient();
  const [result, setResult] = useState<any>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const handleRun = useCallback(async () => {
    if (!clients) {
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      setResult(await clients.hub.adminRunDiagnostics(new Context()));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, [clients]);

  const handleSync = useCallback(
    async (endpoint: 'ghost' | 'kit') => {
      if (!clients) {
        return;
      }
      const input = window.prompt('Max records to sync (blank = unlimited):');
      const count = input ? Number(input) : undefined;
      try {
        await clients.hub.adminRunSync(new Context(), { endpoint, count });
        alert('Sync complete.');
      } catch (err: any) {
        alert(`Sync failed: ${err.message}`);
      }
    },
    [clients],
  );

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <Button onClick={handleRun} disabled={!clients || busy}>
            {busy ? 'Running…' : 'Run DB integrity check'}
          </Button>
          <Button onClick={() => handleSync('ghost')} disabled={!clients}>
            Sync Ghost
          </Button>
          <Button onClick={() => handleSync('kit')} disabled={!clients}>
            Sync Kit
          </Button>
        </Toolbar.Root>
      }
    >
      <ErrorBanner error={error} />
      {result && (
        <div className='p-2'>
          <JsonView data={result} />
        </div>
      )}
    </PanelContainer>
  );
};

//
// Edge bindings panel
//

export const INSPECT_ACTION: TableRowAction[] = [{ id: 'inspect', label: 'Inspect' }];
export const VIEW_ACTION: TableRowAction[] = [{ id: 'view', label: 'View' }];

export const EdgeBindingsPanel = () => {
  const clients = useEdgeAdminClient();
  const [typesData, setTypesData] = useState<any>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh((count) => count + 1), []);
  const [countsData, setCountsData] = useState<any>(undefined);
  const [d1Data, setD1Data] = useState<any>(undefined);

  const [selectedType, setSelectedType] = useState<string | undefined>(undefined);
  const [doList, setDoList] = useState<any>(undefined);
  const [rpcMethods, setRpcMethods] = useState<string[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string | undefined>(undefined);
  const [storageKeys, setStorageKeys] = useState<string[]>([]);
  const [storageValue, setStorageValue] = useState<any>(undefined);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [rpcResult, setRpcResult] = useState<any>(undefined);

  const [selectedTable, setSelectedTable] = useState<string | undefined>(undefined);
  const [tableRows, setTableRows] = useState<any>(undefined);
  const [findColumn, setFindColumn] = useState('');
  const [findValue, setFindValue] = useState('');

  useAsyncEffect(async () => {
    if (!clients) {
      return;
    }
    setError(undefined);
    try {
      const ctx = new Context();
      const [types, counts, d1] = await Promise.all([
        clients.edge.adminGetDurableObjectTypes(ctx),
        clients.edge.adminGetDurableObjectCounts(ctx),
        clients.edge.adminGetD1Tables(ctx),
      ]);
      setTypesData(types);
      setCountsData(counts);
      setD1Data(d1);
    } catch (err: any) {
      setError(err?.message ?? String(err));
      log.error('admin fetch error', { error: err });
    }
  }, [clients, refresh]);

  useAsyncEffect(async () => {
    setSelectedInstance(undefined);
    setStorageKeys([]);
    setStorageValue(undefined);
    setRpcResult(undefined);
    if (!clients || !selectedType) {
      setDoList(undefined);
      setRpcMethods([]);
      return;
    }
    try {
      const ctx = new Context();
      const [list, methods] = await Promise.all([
        clients.edge.adminListDurableObjects(ctx, selectedType, { limit: 50 }),
        clients.edge.adminGetExposedRpcMethods(ctx, selectedType).catch(() => ({ methods: [] })),
      ]);
      setDoList(list);
      setRpcMethods(methods?.methods ?? []);
    } catch (err: any) {
      log.error('admin fetch error', { error: err });
    }
  }, [clients, selectedType]);

  useAsyncEffect(async () => {
    setStorageValue(undefined);
    if (!clients || !selectedType || !selectedInstance) {
      setStorageKeys([]);
      return;
    }
    try {
      const result = await clients.edge.adminGetDurableObjectStorageKeys(new Context(), selectedType, selectedInstance);
      setStorageKeys(result?.keys ?? []);
    } catch (err: any) {
      log.error('admin fetch error', { error: err });
    }
  }, [clients, selectedType, selectedInstance]);

  useAsyncEffect(async () => {
    if (!clients || !selectedTable) {
      setTableRows(undefined);
      return;
    }
    try {
      setTableRows(await clients.edge.adminGetD1Rows(new Context(), selectedTable, { limit: 50 }));
    } catch (err: any) {
      log.error('admin fetch error', { error: err });
    }
  }, [clients, selectedTable]);

  const handleViewValue = useCallback(
    async (key: string) => {
      if (!clients || !selectedType || !selectedInstance) {
        return;
      }
      try {
        setStorageValue(
          await clients.edge.adminGetDurableObjectStoredValue(new Context(), selectedType, selectedInstance, key),
        );
      } catch (err: any) {
        alert(`Failed: ${err.message}`);
      }
    },
    [clients, selectedType, selectedInstance],
  );

  const handleInvoke = useCallback(async () => {
    if (!clients || !selectedType || !selectedInstance || !selectedMethod) {
      return;
    }
    try {
      setRpcResult(
        await clients.edge.adminInvokeRpcMethod(new Context(), selectedType, selectedInstance, selectedMethod),
      );
    } catch (err: any) {
      setRpcResult({ error: err.message });
    }
  }, [clients, selectedType, selectedInstance, selectedMethod]);

  const handleFind = useCallback(async () => {
    if (!clients || !selectedTable || !findColumn) {
      return;
    }
    try {
      setTableRows({ rows: [await clients.edge.adminFindD1Row(new Context(), selectedTable, findColumn, findValue)] });
    } catch (err: any) {
      alert(`Find failed: ${err.message}`);
    }
  }, [clients, selectedTable, findColumn, findValue]);

  const types: string[] = typesData?.types ?? typesData ?? [];
  const counts: Record<string, number> = countsData?.counts ?? {};
  const d1Tables: string[] = (d1Data?.tables ?? []).map((table: any) => table.name ?? String(table));
  const doObjects = withId<any>(
    (doList?.objects ?? []).map((object: any) => ({ id: object.id, ...object.attributes })),
    (row) => String(row.id ?? ''),
  );
  const storageRows = withId<any>(
    storageKeys.map((key) => ({ key })),
    (row) => String(row.key ?? ''),
  );
  const rows: any[] = tableRows?.rows ?? [];
  const rowProperties: TablePropertyDefinition[] =
    rows.length > 0 ? Object.keys(rows[0] ?? {}).map((name) => ({ name, format: Format.TypeFormat.String })) : [];

  return (
    <PanelContainer toolbar={<ReloadToolbar onReload={reload} />}>
      <ErrorBanner error={error} />
      <div className='p-2 space-y-4'>
        <div>
          <p className='text-sm font-medium mb-2'>Durable Object Types</p>
          <div className='flex flex-wrap gap-1'>
            {types.map((type) => (
              <Button
                key={type}
                variant={selectedType === type ? 'primary' : 'default'}
                onClick={() => setSelectedType(type)}
              >
                {type} {counts[type] != null ? `(${counts[type]})` : ''}
              </Button>
            ))}
          </div>
        </div>

        {selectedType && (
          <div className='space-y-1'>
            <p className='text-sm font-medium'>Instances: {selectedType}</p>
            <DynamicTable
              name='org.dxos.hubAdmin.edgeInstances'
              properties={[{ name: 'id', format: Format.TypeFormat.DID }]}
              rows={doObjects}
              rowActions={INSPECT_ACTION}
              onRowAction={(_, row) => setSelectedInstance(String(row.id ?? ''))}
            />
          </div>
        )}

        {selectedInstance && (
          <div className='border border-separator rounded p-3 space-y-3'>
            <div className='flex gap-2 items-center'>
              <span className='font-mono text-xs'>{selectedInstance}</span>
              <Button onClick={() => setSelectedInstance(undefined)}>Close</Button>
            </div>

            {rpcMethods.length > 0 && (
              <Toolbar.Root>
                <select
                  className='text-sm bg-input-surface rounded px-2 py-1'
                  value={selectedMethod}
                  onChange={(event) => setSelectedMethod(event.target.value)}
                >
                  <option value=''>Select RPC method…</option>
                  {rpcMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
                <Button onClick={handleInvoke} disabled={!selectedMethod}>
                  Invoke
                </Button>
              </Toolbar.Root>
            )}
            {rpcResult !== undefined && <JsonView data={rpcResult} />}

            <p className='text-sm font-medium'>Storage keys</p>
            <DynamicTable
              name='org.dxos.hubAdmin.edgeStorage'
              properties={[{ name: 'key', format: Format.TypeFormat.String }]}
              rows={storageRows}
              rowActions={VIEW_ACTION}
              onRowAction={(_, row) => handleViewValue(String(row.key ?? ''))}
            />
            {storageValue !== undefined && <JsonView data={storageValue} />}
          </div>
        )}

        {d1Tables.length > 0 && (
          <div>
            <p className='text-sm font-medium mb-2'>D1 Tables</p>
            <div className='flex flex-wrap gap-1'>
              {d1Tables.map((table) => (
                <Button
                  key={table}
                  variant={selectedTable === table ? 'primary' : 'default'}
                  onClick={() => setSelectedTable(table)}
                >
                  {table}
                </Button>
              ))}
            </div>
          </div>
        )}

        {selectedTable && (
          <div className='border border-separator rounded p-3 space-y-3'>
            <Toolbar.Root>
              <span className='font-mono text-xs'>{selectedTable}</span>
              <Input.Root>
                <Input.TextInput
                  placeholder='column'
                  value={findColumn}
                  onChange={(event) => setFindColumn(event.target.value)}
                />
              </Input.Root>
              <Input.Root>
                <Input.TextInput
                  placeholder='value'
                  value={findValue}
                  onChange={(event) => setFindValue(event.target.value)}
                />
              </Input.Root>
              <Button onClick={handleFind} disabled={!findColumn}>
                Find
              </Button>
              <Button onClick={() => setSelectedTable(undefined)}>Close</Button>
            </Toolbar.Root>
            <DynamicTable
              name='org.dxos.hubAdmin.edgeD1Rows'
              properties={rowProperties}
              rows={withId(rows, (row, index) => String(row?.rowid ?? index))}
            />
          </div>
        )}
      </div>
    </PanelContainer>
  );
};

//
// Danger zone panel
//

export const DangerZonePanel = () => {
  const clients = useEdgeAdminClient();
  const [dryRunResult, setDryRunResult] = useState<any>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const handleDryRun = useCallback(async () => {
    if (!clients) {
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      setDryRunResult(await clients.edge.adminRunSelectivePurge(new Context(), { dryRun: true }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, [clients]);

  const handleConfirmPurge = useCallback(async () => {
    if (!clients || !dryRunResult) {
      return;
    }
    const keepDids: string[] = dryRunResult.expectedKeepDids ?? [];
    if (!window.confirm(`This will purge all orphaned storage. Keep ${keepDids.length} DIDs. Proceed?`)) {
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const result = await clients.edge.adminRunSelectivePurge(new Context(), {
        confirm: true,
        expectedKeepDids: keepDids,
      });
      setDryRunResult(result);
      alert('Purge complete.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, [clients, dryRunResult]);

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <Button onClick={handleDryRun} disabled={!clients || busy}>
            {busy ? 'Running…' : 'Dry run'}
          </Button>
          {dryRunResult && (
            <Button onClick={handleConfirmPurge} disabled={busy}>
              Confirm purge
            </Button>
          )}
        </Toolbar.Root>
      }
    >
      <ErrorBanner error={error} />
      <div className='p-4 space-y-2'>
        <p className='text-sm font-medium text-error'>Selective Storage Purge</p>
        <p className='text-sm text-description'>
          Dry-run first to preview what will be purged, then confirm to execute.
        </p>
        {dryRunResult && <JsonView data={dryRunResult} />}
      </div>
    </PanelContainer>
  );
};

//
// Routes panel
//

export const ROUTE_PROPERTIES: TablePropertyDefinition[] = [
  { name: 'method', format: Format.TypeFormat.String, size: 100 },
  { name: 'path', format: Format.TypeFormat.String, size: 400 },
];

export const RoutesPanel = () => {
  const clients = useEdgeAdminClient();
  const [data, setData] = useState<any>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh((count) => count + 1), []);

  useAsyncEffect(async () => {
    if (!clients) {
      return;
    }
    setError(undefined);
    try {
      setData(await clients.hub.adminListRoutes(new Context()));
    } catch (err: any) {
      setError(err?.message ?? String(err));
      log.error('admin fetch error', { error: err });
    }
  }, [clients, refresh]);

  const rows = withId<any>(
    Array.isArray(data) ? data : (data?.routes ?? []),
    (row) => `${row.method ?? ''} ${row.path ?? ''}`,
  );

  return (
    <PanelContainer toolbar={<ReloadToolbar onReload={reload} />}>
      <ErrorBanner error={error} />
      <DynamicTable name='org.dxos.hubAdmin.routes' properties={ROUTE_PROPERTIES} rows={rows} />
    </PanelContainer>
  );
};

//
// Spaces panel
//

export const SPACE_PROPERTIES: TablePropertyDefinition[] = [
  { name: 'spaceId', format: Format.TypeFormat.DID, title: 'space', size: 200 },
  { name: 'status', format: Format.TypeFormat.String, size: 100 },
  { name: 'identityKey', format: Format.TypeFormat.DID, title: 'identity', size: 200 },
  { name: 'createdAt', format: Format.TypeFormat.DateTime, title: 'created', size: 160 },
  { name: 'lastActivity', format: Format.TypeFormat.DateTime, title: 'last activity', size: 160 },
  { name: 'totalEvents', format: Format.TypeFormat.Number, title: 'events', size: 80 },
];

export const SPACE_ROW_ACTIONS: TableRowAction[] = [
  { id: 'view', label: 'View' },
  { id: 'export', label: 'Export' },
  { id: 'delete', label: 'Delete' },
];
export const SPACE_BULK_ACTIONS: TableRowAction[] = [{ id: 'delete', label: 'Delete' }];

export const AdminSpacesPanel = () => {
  const clients = useEdgeAdminClient();
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [data, setData] = useState<any>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh((count) => count + 1), []);
  const [detail, setDetail] = useState<any>(undefined);
  const [query, setQuery] = useState('');

  useAsyncEffect(async () => {
    if (!clients) {
      return;
    }
    setError(undefined);
    try {
      setData(await clients.edge.adminListSpaces(new Context(), { limit: 50, cursor }));
    } catch (err: any) {
      setError(err?.message ?? String(err));
      log.error('admin fetch error', { error: err });
    }
  }, [clients, cursor, refresh]);

  const rows = withId<any>(
    (data?.spaces ?? []).map((space: any) => ({
      spaceId: space.spaceId,
      status: space.metadata?.status,
      identityKey: space.metadata?.identityKey,
      createdAt: space.metadata?.createdAt,
      lastActivity: space.lastActivity,
      totalEvents: space.totalEvents,
    })),
    (row) => String(row.spaceId ?? ''),
  );
  const nextCursor = data?.cursor;

  const view = useCallback(
    async (spaceId: string) => {
      if (!clients || !spaceId) {
        return;
      }
      try {
        setDetail(await clients.edge.adminGetSpace(new Context(), spaceId));
      } catch (err: any) {
        alert(`Failed to load space: ${err.message}`);
      }
    },
    [clients],
  );

  const exportSpace = useCallback(
    async (spaceId: string) => {
      if (!clients) {
        return;
      }
      try {
        const result = await clients.edge.adminExportSpace(new Context(), spaceId);
        if (result?.downloadUrl) {
          window.open(result.downloadUrl, '_blank');
        }
      } catch (err: any) {
        alert(`Export failed: ${err.message}`);
      }
    },
    [clients],
  );

  const remove = useCallback(
    async (spaceIds: string[]) => {
      if (!clients || spaceIds.length === 0 || !window.confirm(`Delete ${spaceIds.length} space(s)? Irreversible.`)) {
        return;
      }
      try {
        for (const spaceId of spaceIds) {
          await clients.edge.adminDeleteSpace(new Context(), spaceId);
        }
        setDetail(undefined);
        reload();
      } catch (err: any) {
        alert(`Failed: ${err.message}`);
      }
    },
    [clients, reload],
  );

  const onRowAction = useCallback(
    (action: string, row: any) => {
      const spaceId = String(row.spaceId ?? '');
      if (action === 'view') {
        void view(spaceId);
      } else if (action === 'export') {
        void exportSpace(spaceId);
      } else if (action === 'delete') {
        void remove([spaceId]);
      }
    },
    [view, exportSpace, remove],
  );

  return (
    <PanelContainer
      toolbar={
        <ReloadToolbar onReload={reload}>
          <Input.Root>
            <Input.TextInput
              placeholder='Find by spaceId…'
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </Input.Root>
          <Button onClick={() => view(query)} disabled={!clients || !query}>
            Find
          </Button>
        </ReloadToolbar>
      }
    >
      <ErrorBanner error={error} />
      <DynamicTable
        name='org.dxos.hubAdmin.spaces'
        properties={SPACE_PROPERTIES}
        rows={rows}
        rowActions={SPACE_ROW_ACTIONS}
        bulkActions={SPACE_BULK_ACTIONS}
        onRowAction={onRowAction}
        onBulkAction={(_, selected) => remove(selected.map((row) => String(row.spaceId ?? '')))}
      />
      {nextCursor && (
        <div className='p-2'>
          <Button onClick={() => setCursor(nextCursor)}>Load more</Button>
        </div>
      )}
      {detail && (
        <div className='p-2 space-y-2'>
          <div className='flex gap-2 items-center'>
            <span className='font-mono text-xs'>{detail.spaceId}</span>
            <Button onClick={() => setDetail(undefined)}>Close</Button>
          </div>
          <JsonView data={detail} />
        </div>
      )}
    </PanelContainer>
  );
};

//
// Identities panel
//

export const IDENTITY_PROPERTIES: TablePropertyDefinition[] = [
  { name: 'identityKey', format: Format.TypeFormat.DID, title: 'identity', size: 200 },
  { name: 'haloSpaceId', format: Format.TypeFormat.DID, title: 'halo space', size: 200 },
  { name: 'createdAt', format: Format.TypeFormat.DateTime, title: 'created', size: 160 },
  { name: 'hasRecovery', format: Format.TypeFormat.Boolean, title: 'recovery', size: 80 },
];

export const IDENTITY_ROW_ACTIONS: TableRowAction[] = [
  { id: 'view', label: 'View' },
  { id: 'delete', label: 'Delete' },
];
export const IDENTITY_BULK_ACTIONS: TableRowAction[] = [{ id: 'delete', label: 'Delete' }];

export const IdentitiesPanel = () => {
  const clients = useEdgeAdminClient();
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [data, setData] = useState<any>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [refresh, setRefresh] = useState(0);
  const reload = useCallback(() => setRefresh((count) => count + 1), []);
  const [detail, setDetail] = useState<any>(undefined);
  const [query, setQuery] = useState('');

  useAsyncEffect(async () => {
    if (!clients) {
      return;
    }
    setError(undefined);
    try {
      setData(await clients.edge.adminListIdentities(new Context(), { limit: 50, cursor }));
    } catch (err: any) {
      setError(err?.message ?? String(err));
      log.error('admin fetch error', { error: err });
    }
  }, [clients, cursor, refresh]);

  const rows = withId<any>(data?.identities ?? [], (row) => String(row.identityKey ?? ''));
  const nextCursor = data?.cursor;
  const totalCount = data?.totalCount;

  const view = useCallback(
    async (identityKey: string) => {
      if (!clients || !identityKey) {
        return;
      }
      try {
        setDetail(await clients.edge.adminGetIdentity(new Context(), identityKey));
      } catch (err: any) {
        alert(`Failed to load identity: ${err.message}`);
      }
    },
    [clients],
  );

  const remove = useCallback(
    async (identityKeys: string[]) => {
      if (!clients || identityKeys.length === 0 || !window.confirm(`Delete ${identityKeys.length} identity(s)?`)) {
        return;
      }
      try {
        for (const identityKey of identityKeys) {
          await clients.edge.adminDeleteIdentity(new Context(), identityKey);
        }
        setDetail(undefined);
        reload();
      } catch (err: any) {
        alert(`Failed: ${err.message}`);
      }
    },
    [clients, reload],
  );

  const onRowAction = useCallback(
    (action: string, row: any) => {
      const identityKey = String(row.identityKey ?? '');
      if (action === 'view') {
        void view(identityKey);
      } else if (action === 'delete') {
        void remove([identityKey]);
      }
    },
    [view, remove],
  );

  return (
    <PanelContainer
      toolbar={
        <ReloadToolbar onReload={reload}>
          <Input.Root>
            <Input.TextInput
              placeholder='Find by identity key…'
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </Input.Root>
          <Button onClick={() => view(query)} disabled={!clients || !query}>
            Find
          </Button>
        </ReloadToolbar>
      }
    >
      <ErrorBanner error={error} />
      {totalCount != null && <p className='p-2 text-sm text-description'>Total: {totalCount.toLocaleString()}</p>}
      <DynamicTable
        name='org.dxos.hubAdmin.identities'
        properties={IDENTITY_PROPERTIES}
        rows={rows}
        rowActions={IDENTITY_ROW_ACTIONS}
        bulkActions={IDENTITY_BULK_ACTIONS}
        onRowAction={onRowAction}
        onBulkAction={(_, selected) => remove(selected.map((row) => String(row.identityKey ?? '')))}
      />
      {nextCursor && (
        <div className='p-2'>
          <Button onClick={() => setCursor(nextCursor)}>Load more</Button>
        </div>
      )}
      {detail && (
        <div className='p-2 space-y-2'>
          <div className='flex gap-2 items-center'>
            <span className='font-mono text-xs'>{detail.identityKey}</span>
            <Button onClick={() => setDetail(undefined)}>Close</Button>
          </div>
          <JsonView data={detail} />
        </div>
      )}
    </PanelContainer>
  );
};
