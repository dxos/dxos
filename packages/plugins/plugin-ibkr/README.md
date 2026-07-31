# @dxos/plugin-ibkr

Connects Interactive Brokers to Composer via the Flex Web Service and exposes the user's portfolio,
cash balances, and trade history to the assistant.

## How it works

- **Connect** with a Flex Web Service **token** and **Flex query id** (Settings → Connections). The
  credential is stored as an `AccessToken` (the token is the secret; the query id is non-secret and
  kept in `AccessToken.account`).
- A once-a-day **background sync** fetches a Flex report and appends it — raw XML — to a per-space
  hidden feed as a `PortfolioReport`. IBKR's Flex API is rate-limited (1 req/sec, 10/min; repeated
  failures lock the token), so it is touched only by this daily sync.
- The **read operations** (`GetPortfolio`, `GetTrades`) and the assistant skill parse the latest
  stored snapshot — they never call IBKR. Data is an end-of-day snapshot, not a live quote stream.

The navigable **Portfolio** object lists the stored reports; selecting one opens a complementary
plank with the parsed positions, open tax lots, trades, and cash balances.

## Set up the Flex Query in IBKR

The plugin reads an **Activity Flex Query** over IBKR's Flex Web Service. Configure it once in IBKR,
then paste the token and query id into Composer. Everything below is in **Client Portal → Performance
& Reports → Flex Queries** (older UI: _Account Management → Reports → Flex Queries_).

### 1. Enable the Flex Web Service and generate a token

Open **Flex Web Service Configuration**, set the status to **Active**, and **Generate Token**. Copy the
token — this is the secret Composer stores, and it is valid for roughly a year.

### 2. Create the Activity Flex Query

Under **Activity Flex Query**, create a query (name it e.g. `Composer`) and enable these sections.
Keep the column list lean: heavy columns force full-history computation and trigger error 1001.

- **Open Positions** — under _Options_ enable **Lots** (choosing _Summary and Lots_ is fine; the
  plugin tells the two apart by Open Date/Time). Select:
  `Symbol`, `Quantity`, `Mark Price`, `Position Value`, `Cost Basis Price`, `Cost Basis Money`,
  `Unrealized P/L (FIFO)`, `Open Date/Time`, `Currency` (`Conid` optional).
  **`Open Date/Time` is required** — it is what marks each tax lot. Without it you still get the
  aggregated positions, but no per-lot breakdown.
- **Trades** — _Execution_ model. Select:
  `Symbol`, `Buy/Sell`, `Quantity`, `Trade Price`, `Trade Date` (or `Date/Time`), `IB Commission`,
  `Currency`. For realized capital-gains, also enable the Trades **Lots** (closed-lots) detail and add
  `Open Date/Time`, `Cost Basis`, `Proceeds`, `Realized P/L`, `Transaction ID`.
- **Cash Report** — `Currency`, `Ending Cash`. (IBKR adds a `BASE_SUMMARY` row automatically; the
  plugin skips it.)

### 3. Delivery / general configuration

- **Format:** `XML` (not Text/CSV).
- **Date Format:** `yyyyMMdd` · **Time Format:** `HHmmss` · **Date/Time Separator:** `;` (semicolon).
- **Period:** a full year (e.g. _Last 365 Calendar Days_) captures the tax year's trades and closed
  lots; a lighter period (_Last Business Day_ / _Last Month_) is fine if you don't need realized-gain
  history. The daily sync always fetches the latest run of whatever period you pick.

Save the query and note its **Query ID** (the number listed next to it).

### 4. Connect in Composer

Go to **Settings → Connections → Interactive Brokers** and paste the **Flex token** (step 1) and the
**Flex query ID** (step 3). The plugin syncs once a day; you can also trigger a sync from the
Portfolio toolbar.

> **Heads-up — error 1001 and rate limits.** IBKR computes the report on demand, so heavy columns
> (full-history Realized P/L, Wash Sales, MTM) or very long periods can fail with code `1001`
> ("statement still generating"). The Flex API also caps a token at 1 request/sec and 10/min and
> locks it after repeated failures — the plugin stays within this by syncing only once a day.

## Tax / lots

When the query emits lot detail (step 2), the report shows **open tax lots** (per-acquisition cost
basis) and **realized closed lots** (acquired/sold dates, proceeds, cost basis, gain/loss) for
capital-gains reporting, alongside the aggregated positions. Long-vs-short term shown in the UI is
derived from the holding period and is indicative — IBKR's own statements are authoritative for
filing. (A future reducer will build portfolio positions from the open lots.)

See [`PLUGIN.mdl`](./PLUGIN.mdl) for the full specification.
