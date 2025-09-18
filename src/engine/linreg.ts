/**
 * Pine-style linear regression midline + residual std.
 * Mirrors ta.linreg(source, length) evaluated at x = length-1 (last sample in the window).
 * For parity:
 * - Uses x = 0..len-1
 * - Ordinary least squares fit y = a*x + b over the rolling window
 * - Returns midline at x=len-1
 * - Residuals are y - (a*x+b); std computed with (n-1) denom to match Pine behavior closely
 */
export function rollingLinReg(src: number[], length: number): { mid: number[]; residStd: number[]; slope: number[] } {
  const n = src.length;
  const mid = new Array(n).fill(NaN);
  const residStd = new Array(n).fill(NaN);
  const slope = new Array(n).fill(NaN);
  if (length < 2) return { mid, residStd, slope };
  const xs = Array.from({length}, (_, i) => i);
  const sx = xs.reduce((a,b)=>a+b, 0);
  const sxx = xs.reduce((a,b)=>a+b*b, 0);
  const denom = (length * sxx - sx * sx);
  for (let i = length - 1; i < n; i++) {
    let sy = 0, sxy = 0;
    for (let k = 0; k < length; k++) {
      const y = src[i - length + 1 + k];
      sy  += y;
      sxy += xs[k] * y;
    }
    const a = (length * sxy - sx * sy) / denom;     // slope
    const b = (sy - a * sx) / length;               // intercept
    slope[i] = a;
    mid[i] = a * (length - 1) + b;                  // evaluate at last x
    const resids: number[] = [];
    for (let k = 0; k < length; k++) {
      const y = src[i - length + 1 + k];
      const fit = a * xs[k] + b;
      resids.push(y - fit);
    }
    const mean = resids.reduce((p,c)=>p+c,0) / length;
    const varr = resids.reduce((p,c)=>p + (c-mean)*(c-mean), 0) / Math.max(1, length - 1);
    residStd[i] = Math.sqrt(varr);
  }
  return { mid, residStd, slope };
}
