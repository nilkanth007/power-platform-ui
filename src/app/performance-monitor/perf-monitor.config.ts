/**
 * ============================================================
 * Performance Monitor – central configuration
 * ============================================================
 * Keep ALL tunable value ranges here.
 * Import this object into your environment files, e.g.:
 *
 *   // environment.ts
 *   import { PERF_MONITOR_CONFIG } from '<path>/perf-monitor.config';
 *   export const environment = {
 *     production: false,
 *     perfMonitor: { ...PERF_MONITOR_CONFIG, enabled: true }
 *   };
 */

/** Constant allowed time range (ms) for one timing-type row. */
export interface RowRange {
  from: number;
  to: number;   // upper limit – actual Total Time above this shows red
}

export interface PerfMonitorConfig {
  /** Master switch – set per environment. */
  enabled: boolean;

  /**
   * Value ranges (ms) used to colour the badge and summary bar.
   * <= good  -> green | <= moderate -> amber | above -> red
   */
  thresholds: {
    good: number;
    moderate: number;
  };

  /** Where the floating badge sits. */
  position: 'bottom-right' | 'bottom-left';

  /**
   * Keyboard shortcut that toggles the dialog, e.g. 'alt+shift+p'.
   * Format: modifiers (alt, ctrl, shift) + one key. '' = disabled.
   */
  hotkey: string;

  /**
   * After the router finishes a navigation we keep listening for late
   * API calls / rendering for this long (ms) before "closing" the
   * measurement for that page.
   */
  settleTimeMs: number;

  /**
   * How often (ms) we poll to check whether the page has gone idle.
   * Lower = more responsive finalisation, slightly more CPU.
   */
  quietCheckIntervalMs: number;

  /**
   * Hard upper bound (ms) on how long we wait before force-finalising a
   * measurement, even if the page never goes quiet (e.g. polling/sockets).
   */
  hardCapMs: number;

  /** Show the per-API-call rows inside "Browser timing detail". */
  showApiDetail: boolean;

  /** Max detail rows in the dialog (longest first). */
  maxDetailRows: number;

  /** URL substrings to ignore in server-time tracking (analytics, sockets…). */
  excludeUrlPatterns: string[];

  /**
   * CONSTANT allowed time range per timing-type row, shown in the
   * dialog's "Time Range" column. `to` is the upper limit: rows whose
   * actual Total Time exceeds it are highlighted in red with a warning.
   * Key = the row label shown in the "Timing Type" column.
   * Remove a key to fall back to the measured range for that row.
   */
  rowLimits: { [rowLabel: string]: RowRange };
}

export const PERF_MONITOR_CONFIG: PerfMonitorConfig = {
  enabled: true,
  thresholds: {
    good: 1000,      // <= 1s   green
    moderate: 3000   // <= 3s   amber, above red
  },
  position: 'bottom-right',
  hotkey: 'alt+shift+p',
  settleTimeMs: 1500,         // wait after last activity before finalising
  quietCheckIntervalMs: 200,  // idle-poll interval
  hardCapMs: 30000,           // max wait before force-finalising
  showApiDetail: true,
  maxDetailRows: 8,
  excludeUrlPatterns: ['sockjs', 'signalr', 'analytics', 'hot-update'],
  rowLimits: {
    // ---- initial full page load rows ----
    'Cache/DNS/TCP':      { from: 0,   to: 4 },
    'Server':             { from: 5,   to: 32 },
    'Unload':             { from: 0,   to: 0 },
    'DOM Processing':     { from: 32,  to: 339 },
    'onLoad':             { from: 339, to: 340 },
    'API calls (XHR)':    { from: 311, to: 5544 },
    // ---- in-app (route) navigation rows ----
    'Lazy chunks':        { from: 0,   to: 500 },
    'Server (API calls)': { from: 0,   to: 2000 },
    'Route activation':   { from: 0,   to: 300 }
  }
};
