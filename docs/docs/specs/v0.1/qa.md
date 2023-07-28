# QA Script

This is the verification process to promote something from staging to production:

Use your normal, default profile in the browser, falling back to anonymous/guest profiles in case of a problem.


## Composer

- Launch app: [https://composer.staging.dxos.org](https://composer.staging.dxos.org)
- Create a space + document if necessary
- Click between documents, navigation should work
- Click invite on a space
  - scan the QR code with a mobile device
  - see that typing into a document replicates both ways
  - cursors should be present
  - selection highlights should be present
- Ensure device join flow works with an anonymous window on desktop

## CLI

### Installation

- `npm init @dxos@next` (staging)
- `pnpm install`
- `pnpm serve`
- observe that the app loads and presents the "click to login" button
- login and use the counter, observe counter working between two windows
- `pnpm build`

> repeat the process with CLI: `dx app create` using `npm i -g @dxos/cli@next` (staging)

## KUBE

- ensure a prod kube is running locally
- pnpm run deploy the app made with @dxos@next just now
- observe the app on [appname].localhost working

