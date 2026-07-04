// Uganda is UTC+3 year-round (Africa/Kampala, no daylight saving),
// so we can hard-code the offset instead of pulling in a heavy timezone library.
const UGANDA_OFFSET = '+03:00';
export const UGANDA_TIMEZONE = 'Africa/Kampala';

/**
 * Takes the raw value from an <input type="datetime-local"> (e.g. "2026-07-03T14:00")
 * and converts it into an unambiguous ISO 8601 string carrying the Uganda offset,
 * e.g. "2026-07-03T14:00:00+03:00" — safe to send to the API regardless of
 * what timezone the server happens to be running in.
 */
export const datetimeLocalToUgandaISO = (value: string): string => {
  if (!value) return value;
  // value looks like "2026-07-03T14:00" or "2026-07-03T14:00:00"
  const withSeconds = value.length === 16 ? `${value}:00` : value;
  return `${withSeconds}${UGANDA_OFFSET}`;
};

/**
 * Takes any ISO date string (as returned by the API) and converts it into the
 * "YYYY-MM-DDTHH:mm" format an <input type="datetime-local"> expects, expressed
 * in Uganda time — so editing an election shows the time you originally intended,
 * not a UTC-shifted version of it.
 */
export const isoToUgandaDatetimeLocal = (isoString: string): string => {
  if (!isoString) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: UGANDA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(isoString));

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
};

/**
 * Formats any ISO date string for display, always in Uganda time, regardless of
 * the viewer's device/browser timezone settings.
 */
export const formatUganda = (
  isoString: string,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }
): string => {
  if (!isoString) return '';
  return new Intl.DateTimeFormat('en-US', { timeZone: UGANDA_TIMEZONE, ...options }).format(new Date(isoString));
};

/** Short date-only version, e.g. "Jul 3, 2026" */
export const formatUgandaDate = (isoString: string): string =>
  formatUganda(isoString, { year: 'numeric', month: 'short', day: 'numeric' });