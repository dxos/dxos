# plugin-wnfs

Decentralized file storage using Web Native File System (WNFS).

## Status

Labs (experimental).

## Description

Stores and synchronizes files using the WNFS protocol with end-to-end encryption. Files are accessible across devices without central servers.

## Features

- **Decentralized storage**: Files stored in WNFS without central servers.
- **End-to-end encryption**: All files encrypted before leaving the device.
- **Cross-device sync**: Files sync across devices via DXOS network.
- **File browser**: Browse and manage stored files in the workspace.
- **Upload/download**: Import files from local disk and export back.

## Schema

- `org.dxos.type.file` — File object referencing WNFS-stored content.
