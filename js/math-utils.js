/**
 * Least-squares linear regression: returns { m, b, r2 }
 * r2 is the coefficient of determination (1.0 = perfect fit).
 */
export function linearRegression(points) {
  const n = points.length;
  if (n < 2) return null;

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (const { x, y } of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return null; // vertical line

  const m = (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - m * sumX) / n;

  const meanY = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (const { x, y } of points) {
    ssTot += (y - meanY) ** 2;
    ssRes += (y - (m * x + b)) ** 2;
  }
  const r2 = ssTot < 1e-12 ? 1 : 1 - ssRes / ssTot;

  return { m: round(m, 4), b: round(b, 4), r2: round(r2, 6) };
}

export function round(value, decimals) {
  return Math.round(value * 10 ** decimals) / 10 ** decimals;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
