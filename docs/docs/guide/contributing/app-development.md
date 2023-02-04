---
position: 2
label: App Development
---

# App Development

:::note
This section is under development
:::

## Secure Dev Server

Modern browsers treat `localhost` as a secure context, allowing secure apis such a `SubtleCrypto` to be used in an application served from `localhost`, however sometimes this is not enough. For example, you may want other devices on your local network to be able to access your dev server (particularly useful when debugging issues on mobile devices). In this case you would be accessing the app via the ip address of your host machine rather than `localhost`. IP addresses are not a secure context unless they are served with https and a certificate. The apps in this repo are setup to serve the dev server with https when `HTTPS=true`. What follows are instructions on how to setup the certificate for your devices to make this work as expected:

1.  Install mkcert following the [instructions in it's README](https://github.com/FiloSottile/mkcert#installation).
2.  Run `mkcert -install` to create a new local CA.
3.  Generate a cert by running `mkcert localhost <your local IP, i.e. 192.168.1.51>`.
4.  In order for the certificate to be recognized by a mobile device the root CA must be installed on the device. Follow the [instructions from mkcert](https://github.com/FiloSottile/mkcert#mobile-devices) to enable this.
5.  Rename the cert `cert.pem` and the key `key.pem` (all .pem files are gitignored).
6.  The vite config uses a path relative from the CWD to load the key files and each app is setup with the following config:

<!---->

    {
      server: {
        https: process.env.HTTPS === 'true' ? {
          key: './key.pem',
          cert: './cert.pem'
        } : false,
        ...
      },
      ...
    }

Given this, the recommended setup is to run `serve` from the repo root and keep the `cert.pem` and `key.pem` files there. Alternatively, a copy of them could be kept in each app directory if `serve` is run from the app directory as well.

### Proxying using https://srv.us

`srv.us` is easier to setup but will lead to longer loading times.

    pnpm -w nx serve kai
    ssh srv.us -R 1:localhost:5173

    # The session-specific link will be printed.

> NOTE: The amount of files that are needed to be loaded (more then 800 in dev mode) is causing srv.us to bottlenek. On the first time the app takes just under a minute to load, and it might seem like nothing is happening.
