# End-to-end Tests

To run the end-to-end tests locally:

```bash
REMOTE_SOURCE=http://localhost:3967/vault.html NODE_OPTIONS="--max-old-space-size=8192" px e2e composer-app 
```

To debug, add `--inspect --headless=false` to step through each Playwright test.
