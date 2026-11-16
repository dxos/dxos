-- How much each product is talked about and the average tone toward it (-1 to 1), over the messages loaded now:
-- classifications are kept across rebuilds, so the join leaves out those of messages no longer loaded.
SELECT p.product, COUNT(*) AS mentions, ROUND(AVG(p.sentiment), 2) AS tone,
       SUM(p.sentiment < -0.3) AS negative, SUM(p.sentiment > 0.3) AS positive
FROM product_mention p JOIN message m ON m.id = p.message_id
GROUP BY p.product HAVING mentions >= 5 ORDER BY mentions DESC;
