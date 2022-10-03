# Bots <!-- omit in toc -->

<!-- @toc -->

*   [1. Introduction](#1-introduction)

## 1. Introduction

A runtime to run long running processes: bots.

Bots are packaged and published on DXNS blockchain.
Bot factory downloads them and runs them.

Communication with a bot factory is done via an RPC port shared via MESH.
Clients can send commands to spawn new bots or to control the existing ones.

Bot factory is designed to allow for many bot runtimes: NodeJS, Deno, Docker, browser (playwright), etc.

