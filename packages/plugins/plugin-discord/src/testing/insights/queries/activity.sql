-- How many people post how much: the long tail of one-message askers against a few regulars.
SELECT bucket, COUNT(*) AS people FROM (
  SELECT CASE WHEN n = 1 THEN '1' WHEN n <= 3 THEN '2-3' WHEN n <= 10 THEN '4-10' WHEN n <= 30 THEN '11-30'
              WHEN n <= 100 THEN '31-100' ELSE '100+' END AS bucket,
         CASE WHEN n = 1 THEN 1 WHEN n <= 3 THEN 2 WHEN n <= 10 THEN 3 WHEN n <= 30 THEN 4 WHEN n <= 100 THEN 5 ELSE 6 END AS k
  FROM (SELECT author_id, COUNT(*) AS n FROM message WHERE is_bot = 0 GROUP BY author_id)
) GROUP BY bucket ORDER BY MIN(k);
