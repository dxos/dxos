-- Weekly talk and tone per product, beside the changelog entries that week; set :product with sed or edit.
SELECT strftime('%Y-W%W', m.ts) AS week, COUNT(*) AS mentions, ROUND(AVG(p.sentiment), 2) AS tone,
       (SELECT COUNT(*) FROM announcement a WHERE a.product LIKE '%' || p.product || '%'
          AND strftime('%Y-W%W', a.published) = strftime('%Y-W%W', m.ts)) AS launches
FROM product_mention p JOIN message m ON m.id = p.message_id
WHERE p.product = 'PRODUCT' GROUP BY week ORDER BY week;
