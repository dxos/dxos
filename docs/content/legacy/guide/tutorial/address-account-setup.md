---
position: 4
label: Address and Account Setup
---

# Address and Account Setup

In order to be able to publish anything to the DXNS registry you need to create a blockchain address and a DXNS Account. We're going to setup the address, account, and then register a domain. This will require your [development environment to be setup](./dev-environment), so make sure you complete that first.

## Create Registry Address

The Address is a native, built-in account in the DXNS blockchain. It can be also generated for example in a Polkadot Wallet extension.

CLI commands related to CLI profiles begin with: `dx ns address`.

Once you have setup a CLI profile and HALO identity, you can then generate a registry address on the DXNS registry:

```bash
dx ns address generate
```

After running this you will see the following output with a unique address and seed phrase:

```bash
key       value
--------  ----------------------------------------------------------------------------
mnemonic  eyebrow dust cry stove someone remind insane talk health slight swarm yellow
address   5EpqhyY9AfHgmrqwFs7tFh3V89ktNamgTP3TWM5zgeQM8y7a
```

Alternatively, if you already have a mnemonic, you can recover the address with:

```bash
dx ns address recover --mnemonic "eyebrow dust cry stove someone remind insane talk health slight swarm yellow"
```

### Fund Address

We will now add funds to your registry address so that you can pay blockchain transaction fees, and purchase a domain. In order to do this you need the address of a faucet and your registry address. You can find the address of your faucet in your profile config file.

To read your registry address:

```bash
dx ns address list
```

To fund your address

```bash
dx ns balance increase --faucet https://node2.devnet.dxos.network/kube/faucet --address 5EpqhyY9AfHgmrqwFs7tFh3V89ktNamgTP3TWM5zgeQM8y7a
```

You can check that your address has a balance by running the following command:

```bash
dx ns balance get 5EpqhyY9AfHgmrqwFs7tFh3V89ktNamgTP3TWM5zgeQM8y7a
```

When you run that should see an output of:

```bash
key      value
-------  -------------
balance  1000000000000
```

## Create DXNS Account

The DXNS Account is a blockchain record holding ownership of Domains.

CLI commands related to CLI profiles begin with: `dx ns account`.

With your blockchain Address, you can now create a DXNS Account:

```bash
dx ns account create
```

After running this you will see the following output with your new DXNS Account:

```bash
key      value
-------  ----------------------------------------------------------------
account  ba08541beeb8b0781201c21e2eaa437fda5345637fa8cd34e8d9139db06047d8
```

## Domain

Now that you have funds in your account you'll be able to create domains in the registry. All records registered in the registry are created under a domain.

In order to registry a domain on DXNS you need to create an auction for it.

TODO explain auctions

```bash
dx ns auction create example --start-amount 1000000
```

After some time (approximately 10 minutes), you should be able to close the auction and claim that domain, assuming no one else has outbid you:

```bash
dx ns auction close example
dx ns auction claim example
```

It should prompt out a domain key, this is simply an indication that it was successful and we don't need this key for anything.

```bash
key        value
---------  ----------------------------------------------------------------
domainKey  aaaaaaaaa0258fbf170edb873da49c9bd79fa258fa69abef5e8c55bcc020088e
```

While you are waiting for your auction to be able to be closed, we'll move on and circle back to this later.
