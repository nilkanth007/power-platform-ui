/** Shapes shared by the service, interceptor and dialog. */

export interface TimingRow {
  /** e.g. "Cache/DNS/TCP", "Server", "DOM Processing" */
  label: string;
  /** Colour key used for the left indicator bar. */
  color: 'network' | 'server' | 'browser';
  /** Range relative to navigation start, ms. */
  start: number;
  end: number;
  /** end - start, ms. */
  total: number;
}

export interface DetailRow {
  label: string;
  timeMs: number;
}

export interface PageTiming {
  /** Route URL (or document URL for the initial load). */
  page: string;
  /** 'full' = real browser navigation, 'route' = SPA navigation. */
  kind: 'full' | 'route';
  capturedAt: Date;

  /** Summary numbers shown in the header line, ms. */
  responseTime: number;
  network: number;
  server: number;
  browser: number;

  /** Main timing table. */
  rows: TimingRow[];

  /** "Browser timing detail" section. */
  detail: DetailRow[];
}

/** One tracked API call (filled by the interceptor). */
export interface ApiCallRecord {
  url: string;
  method: string;
  startMs: number;
  endMs: number;
  durationMs: number;
}
