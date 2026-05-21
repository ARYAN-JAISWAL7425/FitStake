// Day-boundary helpers.
//
// FitStake serves India, so a "day" follows IST (UTC+5:30, no DST) and rolls
// over at IST midnight — NOT at the server's local midnight. This matters once
// deployed: Render runs in UTC, so without this the cycle day and Google Fit's
// "today" window would be ~5.5h off and only flip at UTC midnight (5:30 AM IST).
//
// Override the offset with APP_TZ_OFFSET_MIN if ever deploying for another region.

const TZ_OFFSET_MIN = parseInt(process.env.APP_TZ_OFFSET_MIN ?? '330', 10); // 330 = IST
const TZ_OFFSET_MS = TZ_OFFSET_MIN * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days since the Unix epoch in the app timezone. Increments at local midnight. */
export function localDayIndex(d: Date = new Date()): number {
  return Math.floor((d.getTime() + TZ_OFFSET_MS) / DAY_MS);
}

/** UTC epoch ms for local midnight (start) of the app-timezone day containing `d`. */
export function localStartOfDayMs(d: Date = new Date()): number {
  return localDayIndex(d) * DAY_MS - TZ_OFFSET_MS;
}
