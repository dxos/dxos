---
dir:
  text: User Guide
  order: 2
headerDepth: 0
---

# Identity

::: warning Technology Preview
Composer is not yet ready for production. There are bugs, and breaking changes may occur. Migration guides will be provided for version updates in the [release notes](https://github.com/dxos/dxos/releases).

All your feedback is most welcome on [Discord](https://dxos.org/discord).
:::

### What it is

An identity associates a user with their data. It plays the role of an account in a traditional client/server system.

### Initial creation

An identity is created the first time you visit a DXOS-powered application in the browser.

::: warning Single-device identities are fragile
See [Account recovery](#account-recovery) below.
:::

### Adding other devices

From that browser you can then asssociate another device with your identity:

<video controls loop autoplay style="width:100%" src="/images/device-invitations.mp4"></video>

Each of these devices synchronizes data and can also be used to add additional devices to the the identity.

Say you create an initial identity and then add two other devices to it. You know have:

* Three copies of your data (once they finish the initial sync)
* Three places from which you create invitiations to add new devices to your identity

::: note You can have more than one 'device' per computer

Each app is its own device.

Even different tabs in the same browser profile are different devices as long as they're on different domains. Tabs in the same browser profile and at the same domain share a device.
:::

## Account recovery

Since you need a device with an identity to add new devices, your identity is only as durable as your devices.

This means that like you spread backups across multiple computers, you should also spread your identity across multiple computers by adding devices on each one.

In the future we plan to support recovering an identity using a [seed phrase](../../guide/glossary.md#seed-phrase), sometimes referred to as paper key recovery.

## Comparison to traditional accounts

### Upsides

* There are no passwords to track
* You can associate new devices with an identity even without Internet access

### Downsides

* If you lose your identity it's permanently lost. Since it's not company controlled there's no place to appeal to for backchannel recovery.
