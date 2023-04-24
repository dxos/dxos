# Playwright Tests

The following are some guidelines which we've found helpful for writing playwright tests:

1. As much as possible use `data-testid` in code as the selector in tests.
This serves two purposes, it's a unique selector but it's also explicitly called out as a selector for test purposes.
This makes it clear that if removed or changed tests will likely need to be updated.
The pattern we've settled on is `<component>.<element>` as a pattern for the ids.
2. Rather than using Playwright's recorder for building tests by clicking around, we've found a good balance of maintainability and readability by abstracting a "manager" class (e.g., [app-manager.ts](../../../packages/apps/todomvc/src/playwright/app-manager.ts)) for whatever we're testing.
This allows the, sometimes confusing, Playwright actions to be collected under named methods with a clear purpose.
It also means that sometimes when making changes, the manager class can be updated and the tests still work.
3. Avoid arbitrary `sleep` calls (or `waitForExpect`) as much as possible.
If these are needed it may be indicative that the test is ill-conceived.
As an alternative, wait for something in the DOM/browser to change to indicate that correct conditions are met to continue.
If something is not exposed in the UI of that app that is trying to be tested, this test maybe belongs elsewhere - either at a lower level unit test or a sandbox with a more arbitrary ui (e.g., [Invitations.stories.tsx](../../../packages/sdk/react-shell/src/stories/Invitations.stories.tsx)).

> NOTE: Currently one expection to the above is dealing with focus which we've found to be quite flaky in tests and sometimes requiring `sleep` calls to improve reliability.
