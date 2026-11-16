-- Human messages per week, keyed by the week's Monday.
SELECT date(ts, '-6 days', 'weekday 1') AS week, COUNT(*) AS messages
FROM message WHERE is_bot = 0 GROUP BY week ORDER BY week;
