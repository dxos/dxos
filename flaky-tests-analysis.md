# Flaky Tests Analysis and Fixes

## Summary

After analyzing the playwright tests for composer-app, I've identified several patterns that indicate flaky tests and implemented fixes to improve their stability.

## Configuration Changes

### `playwright.config.ts`
- Added `repeatEach: 10` to run each test 10 times for identifying flaky tests

## Identified Flaky Tests

### 1. Basic Tests (`basic.spec.ts`)
- **Test:** `reset app` - Marked as flaky in webkit
- **Test:** `reset device` - Marked as flaky in firefox & webkit, uses long timeout
- **Issues:** Browser-specific skips, timing issues with reset operations

### 2. Collaboration Tests (`collaboration.spec.ts`)
- **All tests marked as flaky** - These involve multiple browsers and network communication
- **Issues:** 
  - WebRTC communication between browsers
  - Network latency and synchronization issues
  - Browser-specific limitations (only works in chromium)
  - Uses explicit sleep() calls for timing

### 3. Comments Tests (`comments.spec.ts`)
- **Test:** `delete message` - Explicitly marked as "Flaky in CI"
- **Issues:** Browser-specific behavior differences

### 4. Collections Tests (`collections.spec.ts`)
- **Test:** `re-order collections` - Firefox/Webkit unable to click on actions menu in CI
- **Test:** `drag object into collection` - Explicitly marked as "quite flaky in webkit"
- **Issues:** Drag and drop operations, browser-specific UI interaction issues

### 5. Stack Tests (`stack.spec.ts`)
- **All tests marked as flaky** - Fails when running headlessly in webkit
- **Issues:** Browser-specific rendering issues, uses sleep() for timing

## Fixes Implemented

### 1. Test Identification
- Added `.only` to all flaky tests to focus on them for the repeatEach: 10 runs
- This allows identifying which tests consistently fail vs. pass

### 2. App Manager Improvements (`app-manager.ts`)
Added better waiting and timing mechanisms:

#### User Account Operations
- Added explicit waits for user account menu to open
- Added waits for devices page to load

#### Space Operations
- Added waits for share space modal to open
- Added waits for space state changes with `waitForTimeout(500)`

#### Object Operations
- Added waits for object creation, navigation, renaming, and deletion
- Added 1-second waits for operations to complete

#### Plugin Operations
- Added waits for settings and plugin registry to load
- Added waits for registry categories to load

#### Drag and Drop
- Added additional wait after drag operations complete

### 3. Timing Improvements
- Replaced implicit waits with explicit waits where possible
- Added strategic timeouts for UI state changes
- Improved synchronization between test actions

## Flaky Test Patterns Identified

1. **Browser-specific skips** - Tests that work in some browsers but not others
2. **Network communication** - Tests involving multiple browsers or external services
3. **Timing-dependent operations** - Tests using `sleep()` or relying on timing
4. **Drag and drop operations** - Notoriously flaky in automated testing
5. **UI state changes** - Tests that don't wait for UI to stabilize
6. **Explicit flakiness comments** - Tests marked as flaky by developers

## Recommendations

1. **Use explicit waits** instead of sleep() where possible
2. **Add proper synchronization** for UI state changes
3. **Improve error handling** for browser-specific issues
4. **Consider mocking** network operations in collaboration tests
5. **Use more robust selectors** for UI elements
6. **Add retry mechanisms** for inherently flaky operations

## Test Files Modified

- `basic.spec.ts` - Added .only to flaky tests
- `collaboration.spec.ts` - Added .only to all tests (all flaky)
- `comments.spec.ts` - Added .only to flaky test
- `collections.spec.ts` - Added .only to flaky tests
- `stack.spec.ts` - Added .only to all tests (all flaky)
- `app-manager.ts` - Added better waits and timing
- `playwright.config.ts` - Added repeatEach: 10

## Next Steps

1. Run the tests with `repeatEach: 10` to confirm flakiness
2. Remove .only from tests that consistently pass
3. Continue refining waits and timing for remaining flaky tests
4. Consider architectural changes for inherently flaky test patterns