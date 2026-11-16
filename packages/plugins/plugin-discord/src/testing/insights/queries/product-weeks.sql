-- Weekly talk and tone for one product (bind it with `--param product=<name>`), beside the changelog and blog entries
-- naming it that week. Weeks are keyed by their Monday; a week with launches but no mentions still shows.
WITH weeks AS (
  SELECT DISTINCT date(ts, '-6 days', 'weekday 1') AS week FROM message
), mentions AS (
  SELECT date(m.ts, '-6 days', 'weekday 1') AS week, COUNT(*) AS mentions, ROUND(AVG(p.sentiment), 2) AS tone
  FROM product_mention p JOIN message m ON m.id = p.message_id WHERE p.product = :product GROUP BY week
), launches AS (
  -- A changelog entry can name several products ("Workflows, Workers"), so match one of the comma-separated names.
  SELECT date(published, '-6 days', 'weekday 1') AS week, COUNT(*) AS launches
  FROM announcement WHERE (', ' || product || ',') LIKE ('%, ' || :product || ',%') GROUP BY week
)
SELECT w.week, COALESCE(m.mentions, 0) AS mentions, m.tone, COALESCE(l.launches, 0) AS launches
FROM weeks w LEFT JOIN mentions m ON m.week = w.week LEFT JOIN launches l ON l.week = w.week ORDER BY w.week;
