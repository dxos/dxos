//
// Copyright 2026 DXOS.org
//

import { type Page } from '@playwright/test';

import { type InboxHttpMock, type InboxHttpMockOptions, createInboxHttpMock } from '@dxos/plugin-inbox/testing/http-mock';

// Intercept the browser's provider HTTP and answer it from the fixture-backed mock. `page.route`
// only sees browser-originated requests, which is exactly the inbox sync/send path today (sync runs
// client-side). See the `inbox-e2e-sync-in-browser-dependency` note: when sync moves to the edge,
// this interception stops applying and an in-browser flag will be needed.
export const installInboxMock = async (page: Page, options?: InboxHttpMockOptions): Promise<InboxHttpMock> => {
  const mock = createInboxHttpMock(options);
  await page.route(isMockedUrl, async (route) => {
    const request = route.request();
    const response = mock.handle({ method: request.method(), url: request.url(), body: request.postData() ?? undefined });
    if (!response) {
      // Not a request the mock owns — let it hit the network (or a later route).
      return route.fallback();
    }
    await route.fulfill({ status: response.status, contentType: response.contentType, body: response.body });
  });
  return mock;
};

/** URLs the inbox mock owns: Gmail REST, Gmail userinfo, JMAP discovery + the discovered api host. */
const isMockedUrl = (url: URL): boolean =>
  (url.hostname === 'gmail.googleapis.com' && url.pathname.startsWith('/gmail/v1/')) ||
  (url.hostname === 'www.googleapis.com' && url.pathname === '/oauth2/v3/userinfo') ||
  url.pathname === '/.well-known/jmap' ||
  url.hostname === 'jmap.test';
