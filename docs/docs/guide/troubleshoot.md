---
order: 100
---

# Troubleshooting

### Resetting IndexDB
You may occasionally need to reset the IndexDB database behind [`HALO`](./platform/halo.md) in case of problems. 

To do this, navigate to the `Application` tab in your browser developer tools, and locate the IndexDB node. Select the IndexDB database on the `halo.dxos.org` domain (or any others you control) and click `Delete`. The database will be re-created on the next run.