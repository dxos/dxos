---
position: 1.5
label: Quick start
---
## Using an ECHO database for state consensus
Install ECHO with your package manager of choice
```bash
npm install --save @dxos/echo
```
Create an ECHO client instance either in browser or on the server:
```ts
import { Client } from "@dxos/echo"

const client = new Client();
```
See here for the [configuration options](/docs/echo/configuration) you can pass in.

Create a space and query items:
```ts
const space = client.spaces.createSpace();
const items = await space.getItems();
```

Using `ClientProvider` and `useClient` with React:
```tsx
import { ClientProvider, useClient } from "@dxos/react-client";

export const App = () => {
  const client = useClient();
  // ...
  return (<div />);
};

ReactDOM.render(
  <ClientProvider client={client}>
    <App />
  </ClientProvider>,
  document.getElementById('root')
);
```

Read more:
- [ECHO overview](/docs/echo/overview)
- [ECHO configuration](/docs/echo/configuration)
- [ECHO with React](/docs/echo/react)
- [how ECHO works](/docs/echo/how-echo-works)
- Implement user identity with [HALO](/docs/halo/overview)

## Creating apps
The `dx` cli offers a production-ready application template for building **local-first applications** with ECHO. The template is made of `vite`, `typescript`, `react`, `echo`, `pwa`, and other opinions. 

Using your favorite package manager of choice like `npm`, `yarn`, or `pnpm`:
```bash
npm i -g @dxos/cli 
```
Now you can use the `dx` command line tool:
```bash
dx apps create hello # or with --template=bare
cd hello
npm run dev
```
This will start the development server in the new application .

Building your app for production:
```bash
npm build
```
This will produce a `dist` folder with an entry point and a `dist/README.md`

Read more:
- [hello world template](https://)
- [bare template](https://)

## Starting a KUBE
Runnig a [KUBE](/docs/kube/overview) gives you superpowers. Installation:
```bash
sudo ch=dev bash -c "$(curl -fsSL https://dxos.nyc3.digitaloceanspaces.com/install.sh)"
```
Then:
```bash
kube start # start the service in the background
open localhost:9000 # open the browser to the console
```
Read more:
- [KUBE Overview](/docs/kube/overview)

## Deploying your app to a KUBE
Use the `dx` cli to create a default `dx.yml` file:
```bash
dx app init
```
Read more about the [`dx.yml` file schema](/docs/kube/dx-yml-file).

Publish your app to your local kube:
```bash
dx app publish
```
Read more:
- [Publishing apps](kube/publishing)

## Sharing your app
> TODO