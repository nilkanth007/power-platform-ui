import { Injectable, NgZone, Optional, Inject, InjectionToken } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { PERF_MONITOR_CONFIG, PerfMonitorConfig } from './perf-monitor.config';
import { ApiCallRecord, DetailRow, PageTiming, TimingRow } from './perf-monitor.model';

/**
 * Provide this token from your environment file to override the defaults:
 *   { provide: PERF_MONITOR_SETTINGS, useValue: environment.perfMonitor }
 */
export const PERF_MONITOR_SETTINGS = new InjectionToken<Partial<PerfMonitorConfig>>('PERF_MONITOR_SETTINGS');

@Injectable({ providedIn: 'root' })
export class PerformanceMonitorService {

  readonly config: PerfMonitorConfig;

  /** Latest finished measurement – the badge & dialog subscribe to this. */
  readonly timing$ = new BehaviorSubject<PageTiming | null>(null);

  /** True while a page is loading / being measured – badge shows a spinner. */
  readonly measuring$ = new BehaviorSubject<boolean>(false);

  // ---- per-navigation state -------------------------------------------
  private apiCalls: ApiCallRecord[] = [];
  private pendingRequests = 0;
  private lastActivityMs = 0;          // performance.now() of last interesting event
  private navStartMs = 0;              // performance.now() at NavigationStart
  private routerEndMs = 0;             // performance.now() at NavigationEnd
  private currentUrl = '';
  private settleTimer: any = null;   // route navigations (cancelled by a new navigation)
  private initTimer: any = null;     // initial load (NEVER cancelled by navigations)
  private initialLoadDone = false;

  constructor(
    private router: Router,
    private zone: NgZone,
    @Optional() @Inject(PERF_MONITOR_SETTINGS) settings: Partial<PerfMonitorConfig> | null
  ) {
    this.config = { ...PERF_MONITOR_CONFIG, ...(settings || {}) };
    if (!this.config.enabled) { return; }

    this.watchRouter();
    this.captureInitialLoad();
  }

  // ======================================================================
  // Called by the HTTP interceptor
  // ======================================================================
  notifyRequestStart(): void {
    this.pendingRequests++;
    this.lastActivityMs = performance.now();
  }

  notifyRequestEnd(record: ApiCallRecord): void {
    this.pendingRequests = Math.max(0, this.pendingRequests - 1);
    this.lastActivityMs = performance.now();
    this.apiCalls.push(record);
  }

  // ======================================================================
  // SPA route navigations – measured automatically, no per-page code
  // ======================================================================
  private watchRouter(): void {
    this.router.events.subscribe(ev => {
      if (ev instanceof NavigationStart) {
        // A new page starts: reset collection for this navigation.
        this.clearSettleTimer();
        this.navStartMs = performance.now();
        this.routerEndMs = 0;
        this.lastActivityMs = this.navStartMs;
        this.apiCalls = [];
        this.measuring$.next(true);
      } else if (ev instanceof NavigationEnd) {
        this.currentUrl = ev.urlAfterRedirects;
        this.routerEndMs = performance.now();
        this.lastActivityMs = this.routerEndMs;
        // Skip the very first NavigationEnd – it belongs to the initial
        // full page load, which is measured with the Navigation Timing API.
        if (!this.initialLoadDone) { return; }
        this.waitForQuietThen(() => this.finalizeRouteTiming());
      } else if (ev instanceof NavigationCancel || ev instanceof NavigationError) {
        this.clearSettleTimer();
        // Keep the spinner if the initial load is still being measured.
        if (!this.initTimer) { this.measuring$.next(false); }
      }
    });
  }

  /**
   * Wait until there are no pending HTTP calls and nothing has happened
   * for `settleTimeMs`, then run `done`. Hard-capped at `config.hardCapMs`.
   */
  private waitForQuietThen(done: () => void): void {
    this.clearSettleTimer();
    const started = performance.now();
    this.zone.runOutsideAngular(() => {
      this.settleTimer = setInterval(() => {
        const now = performance.now();
        const quietFor = now - this.lastActivityMs;
        const capped = now - started > this.config.hardCapMs;
        if ((this.pendingRequests === 0 && quietFor >= this.config.settleTimeMs) || capped) {
          this.clearSettleTimer();
          done();
        }
      }, this.config.quietCheckIntervalMs);
    });
  }

  private clearSettleTimer(): void {
    if (this.settleTimer) {
      clearInterval(this.settleTimer);
      this.settleTimer = null;
    }
  }

  private finalizeRouteTiming(): void {
    const calls = this.apiCalls.slice();
    const navStart = this.navStartMs;
    const routerEnd = this.routerEndMs || navStart;

    // Server time = union of all API call intervals (parallel calls are
    // not double-counted).
    const merged = this.mergeIntervals(calls.map(c => [c.startMs, c.endMs] as [number, number]));
    const serverMs = merged.reduce((s, [a, b]) => s + (b - a), 0);

    // End of the page = last thing that happened (API end or router end).
    const lastEnd = Math.max(routerEnd, ...calls.map(c => c.endMs));
    const responseTime = lastEnd - navStart;

    // Lazy-loaded JS chunks fetched during this navigation = network.
    const chunkMs = this.lazyChunkTime(navStart, lastEnd);

    const browser = Math.max(0, responseTime - serverMs - chunkMs);

    const rel = (v: number) => Math.max(0, Math.round(v - navStart));
    const rows: TimingRow[] = [];

    if (chunkMs > 0) {
      rows.push(this.row('Lazy chunks', 'network', 0, chunkMs));
    }
    if (merged.length) {
      rows.push(this.row('Server (API calls)', 'server',
        rel(merged[0][0]), rel(merged[merged.length - 1][1])));
    }
    rows.push(this.row('Route activation', 'browser', 0, rel(routerEnd)));
    rows.push(this.row('DOM Processing', 'browser', rel(routerEnd), rel(lastEnd)));

    const detail: DetailRow[] = [];
    detail.push({ label: 'Route activation (guards/resolvers)', timeMs: Math.round(routerEnd - navStart) });
    detail.push({ label: 'Rendering / settle', timeMs: Math.round(lastEnd - Math.max(routerEnd, merged.length ? merged[merged.length - 1][1] : routerEnd)) });
    this.pushApiDetail(detail, calls);

    this.emit({
      page: this.currentUrl,
      kind: 'route',
      capturedAt: new Date(),
      responseTime: Math.round(responseTime),
      network: Math.round(chunkMs),
      server: Math.round(serverMs),
      browser: Math.round(browser),
      rows,
      detail: detail.filter(d => d.timeMs > 0).slice(0, this.config.maxDetailRows)
    });
  }

  // ======================================================================
  // Initial full page load – W3C Navigation Timing API
  // ======================================================================
  private captureInitialLoad(): void {
    this.measuring$.next(true);
    const finish = () => {
      // Also wait for the first wave of API calls that Angular apps
      // typically fire right after bootstrap.
      this.lastActivityMs = performance.now();
      this.waitForInitQuiet();
    };
    if (document.readyState === 'complete') {
      finish();
    } else {
      this.zone.runOutsideAngular(() =>
        window.addEventListener('load', () => setTimeout(finish, 0), { once: true }));
    }
  }

  /**
   * Initial-load settle timer. Uses its OWN handle so a route navigation
   * (which clears settleTimer) can never cancel it – this guarantees the
   * spinner always stops and the first measurement is always published.
   */
  private waitForInitQuiet(): void {
    if (this.initTimer) { clearInterval(this.initTimer); }
    const started = performance.now();
    this.zone.runOutsideAngular(() => {
      this.initTimer = setInterval(() => {
        const now = performance.now();
        const quietFor = now - this.lastActivityMs;
        const capped = now - started > this.config.hardCapMs;
        if ((this.pendingRequests === 0 && quietFor >= this.config.settleTimeMs) || capped) {
          clearInterval(this.initTimer);
          this.initTimer = null;
          this.initialLoadDone = true;
          this.finalizeFullLoadTiming();
        }
      }, this.config.quietCheckIntervalMs);
    });
  }

  private finalizeFullLoadTiming(): void {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (!nav) { this.zone.run(() => this.measuring$.next(false)); return; }

    const calls = this.apiCalls.slice();
    const r = (v: number) => Math.round(v);

    // ---- main table (same rows as the ServiceNow dialog) ---------------
    const rows: TimingRow[] = [
      this.row('Cache/DNS/TCP', 'network', r(nav.fetchStart), r(nav.connectEnd)),
      this.row('Server', 'server', r(nav.requestStart), r(nav.responseEnd)),
      this.row('Unload', 'browser', r(nav.unloadEventStart), r(nav.unloadEventEnd)),
      this.row('DOM Processing', 'browser', r(nav.responseEnd), r(nav.domComplete)),
      this.row('onLoad', 'browser', r(nav.loadEventStart), r(nav.loadEventEnd))
    ];

    // ---- summary numbers ------------------------------------------------
    const apiMerged = this.mergeIntervals(calls.map(c => [c.startMs, c.endMs] as [number, number]));
    const apiMs = apiMerged.reduce((s, [a, b]) => s + (b - a), 0);

    const lastEnd = Math.max(nav.loadEventEnd, nav.domComplete, ...calls.map(c => c.endMs));
    const network = nav.connectEnd - nav.fetchStart;             // DNS + TCP (+TLS)
    const server = (nav.responseEnd - nav.requestStart) + apiMs; // document + XHR/fetch
    const responseTime = lastEnd;                                // since navigation start
    const browser = Math.max(0, responseTime - network - server);

    if (apiMs > 0) {
      rows.push(this.row('API calls (XHR)', 'server',
        r(apiMerged[0][0]), r(apiMerged[apiMerged.length - 1][1])));
    }

    // ---- browser timing detail -----------------------------------------
    const detail: DetailRow[] = [];
    detail.push({ label: 'CSS and JS Parse', timeMs: this.cssJsTime() });
    const fcp = performance.getEntriesByType('paint')
      .find(p => p.name === 'first-contentful-paint');
    if (fcp) { detail.push({ label: 'First contentful paint', timeMs: r(fcp.startTime) }); }
    const bootstrapMark = performance.getEntriesByName('perfmon:ng-bootstrap')[0];
    if (bootstrapMark) { detail.push({ label: 'Angular bootstrap', timeMs: r(bootstrapMark.startTime) }); }
    detail.push({ label: 'DOM Content Loaded', timeMs: r(nav.domContentLoadedEventEnd) });
    this.pushApiDetail(detail, calls);

    this.emit({
      page: location.pathname + location.search,
      kind: 'full',
      capturedAt: new Date(),
      responseTime: r(responseTime),
      network: r(network),
      server: r(server),
      browser: r(browser),
      rows,
      detail: detail.filter(d => d.timeMs > 0).slice(0, this.config.maxDetailRows)
    });
  }

  // ======================================================================
  // helpers
  // ======================================================================
  private row(label: string, color: TimingRow['color'], start: number, end: number): TimingRow {
    return { label, color, start, end: Math.max(start, end), total: Math.max(0, Math.round(end - start)) };
  }

  private emit(t: PageTiming): void {
    this.zone.run(() => {
      this.timing$.next(t);
      this.measuring$.next(false);
    });
  }

  /** Total (non-overlapping) ms of script/css resource loading. */
  private cssJsTime(): number {
    const res = (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
      .filter(e => ['script', 'link', 'css'].indexOf(e.initiatorType) >= 0)
      .map(e => [e.startTime, e.responseEnd] as [number, number]);
    return Math.round(this.mergeIntervals(res).reduce((s, [a, b]) => s + (b - a), 0));
  }

  /** Time spent fetching lazy-loaded JS chunks inside [from, to]. */
  private lazyChunkTime(from: number, to: number): number {
    const res = (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
      .filter(e => e.initiatorType === 'script' && e.startTime >= from && e.startTime <= to)
      .map(e => [e.startTime, e.responseEnd] as [number, number]);
    return Math.round(this.mergeIntervals(res).reduce((s, [a, b]) => s + (b - a), 0));
  }

  private pushApiDetail(detail: DetailRow[], calls: ApiCallRecord[]): void {
    if (!this.config.showApiDetail) { return; }
    calls
      .slice()
      .sort((a, b) => b.durationMs - a.durationMs)
      .forEach(c => detail.push({
        label: `${c.method} ${this.shortUrl(c.url)}`,
        timeMs: Math.round(c.durationMs)
      }));
  }

  private shortUrl(url: string): string {
    try {
      const u = new URL(url, location.origin);
      const path = u.pathname;
      return path.length > 42 ? '…' + path.slice(-41) : path;
    } catch {
      return url;
    }
  }

  private mergeIntervals(list: Array<[number, number]>): Array<[number, number]> {
    if (!list.length) { return []; }
    const sorted = list.slice().sort((a, b) => a[0] - b[0]);
    const out: Array<[number, number]> = [sorted[0].slice() as [number, number]];
    for (let i = 1; i < sorted.length; i++) {
      const last = out[out.length - 1];
      if (sorted[i][0] <= last[1]) {
        last[1] = Math.max(last[1], sorted[i][1]);
      } else {
        out.push(sorted[i].slice() as [number, number]);
      }
    }
    return out;
  }
}
