# Kai Remote Functions

## Set-up Multipass

Faasd must run in a VM since it will create its own `containerd` runtime.
[Multipass](https://github.com/openfaas/faasd/blob/master/docs/MULTIPASS.md) supports Ubuntu VMs for OSX.

```bash
multipass launch --name faasd --cloud-init ./setup/cloud-config.txt -d 10G
multipass info faasd
```

```bash
multipass launch stop faasd
multipass launch delete faasd
multipass launch purge
```

## 