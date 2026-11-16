-- How much each product is talked about and the average tone toward it (-1 to 1).
SELECT product, COUNT(*) AS mentions, ROUND(AVG(sentiment), 2) AS tone,
       SUM(sentiment < -0.3) AS negative, SUM(sentiment > 0.3) AS positive
FROM product_mention GROUP BY product HAVING mentions >= 5 ORDER BY mentions DESC;
