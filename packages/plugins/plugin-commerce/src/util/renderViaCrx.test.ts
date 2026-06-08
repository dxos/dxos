//
// Copyright 2026 DXOS.org
//
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { EffectEx } from '@dxos/effect';

const proxyFetchLegacy = vi.fn(
  async () => new Response('PROXY_BODY', { status: 200, headers: { 'content-type': 'text/html' } }),
);

vi.mock('@dxos/edge-client', () => ({ proxyFetchLegacy }));

const RENDER_EVENT = 'composer:search-proxy:render';
const RENDER_ACK_EVENT = 'composer:search-proxy:render:ack';

const setAvailable = (available: boolean) => {
  if (available) {
    document.documentElement.dataset.composerSearchProxy = '1';
  } else {
    delete document.documentElement.dataset.composerSearchProxy;
  }
};

// Stand in for the extension content relay: ack each render request with the given outcome.
const installFakeRelay = (respond: (id: string) => unknown) => {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent).detail as { id: string };
    window.dispatchEvent(new CustomEvent(RENDER_ACK_EVENT, { detail: respond(detail.id) }));
  };
  window.addEventListener(RENDER_EVENT, listener);
  return () => window.removeEventListener(RENDER_EVENT, listener);
};

describe('renderViaCrx', () => {
  beforeEach(() => {
    proxyFetchLegacy.mockClear();
    setAvailable(false);
  });

  afterEach(() => {
    vi.resetModules();
  });

  test('isCrxRenderAvailable reflects the dataset marker', async ({ expect }) => {
    const { isCrxRenderAvailable } = await import('./renderViaCrx');
    expect(isCrxRenderAvailable()).toBe(false);
    setAvailable(true);
    expect(isCrxRenderAvailable()).toBe(true);
  });

  test('renderViaCrx resolves with the rendered HTML on a successful ack', async () => {
    setAvailable(true);
    const { renderViaCrx } = await import('./renderViaCrx');
    const uninstall = installFakeRelay((id) => ({
      version: 1,
      id,
      ok: true,
      html: '<html>RENDERED</html>',
      finalUrl: 'https://x',
    }));

    const html = await EffectEx.runAndForwardErrors(renderViaCrx('https://example.com'));
    expect(html).toEqual('<html>RENDERED</html>');
    uninstall();
  });

  test('renderViaCrx fails when the extension is unavailable', async () => {
    setAvailable(false);
    const { renderViaCrx } = await import('./renderViaCrx');
    await expect(EffectEx.runAndForwardErrors(renderViaCrx('https://example.com'))).rejects.toThrow(/not available/);
  });

  test('renderViaCrx fails on a non-ok ack', async () => {
    setAvailable(true);
    const { renderViaCrx } = await import('./renderViaCrx');
    const uninstall = installFakeRelay((id) => ({ version: 1, id, ok: false, error: 'forbiddenOrigin' }));
    await expect(EffectEx.runAndForwardErrors(renderViaCrx('https://example.com'))).rejects.toThrow(/forbiddenOrigin/);
    uninstall();
  });
});

describe('fetchPage routing', () => {
  beforeEach(() => {
    proxyFetchLegacy.mockClear();
    setAvailable(false);
  });

  test('uses the edge proxy when rendering is not requested', async () => {
    const { fetchPage } = await import('./fetch');
    const body = await EffectEx.runAndForwardErrors(fetchPage({ method: 'GET', url: 'https://example.com' }));
    expect(body).toEqual('PROXY_BODY');
    expect(proxyFetchLegacy).toHaveBeenCalledTimes(1);
  });

  test('falls back to the edge proxy when render is requested but the extension is absent', async () => {
    const { fetchPage } = await import('./fetch');
    const body = await EffectEx.runAndForwardErrors(
      fetchPage({ method: 'GET', url: 'https://example.com' }, { render: true }),
    );
    expect(body).toEqual('PROXY_BODY');
    expect(proxyFetchLegacy).toHaveBeenCalledTimes(1);
  });

  test('renders via the extension when requested and available', async () => {
    setAvailable(true);
    const { fetchPage } = await import('./fetch');
    const uninstall = installFakeRelay((id) => ({ version: 1, id, ok: true, html: 'RENDERED', finalUrl: 'https://x' }));
    const body = await EffectEx.runAndForwardErrors(
      fetchPage({ method: 'GET', url: 'https://example.com' }, { render: true }),
    );
    expect(body).toEqual('RENDERED');
    expect(proxyFetchLegacy).not.toHaveBeenCalled();
    uninstall();
  });

  test('never renders a POST request (uses the proxy)', async () => {
    setAvailable(true);
    const { fetchPage } = await import('./fetch');
    const body = await EffectEx.runAndForwardErrors(
      fetchPage({ method: 'POST', url: 'https://example.com', body: 'x' }, { render: true }),
    );
    expect(body).toEqual('PROXY_BODY');
    expect(proxyFetchLegacy).toHaveBeenCalledTimes(1);
  });
});
