import { ChangeDetectionStrategy, Component, HostListener } from '@angular/core';
import { PerformanceMonitorService } from './performance-monitor.service';
import { PageTiming, TimingRow } from './perf-monitor.model';

/**
 * Floating response-time badge + "Browser response time" dialog
 * (UI replica of the ServiceNow response time indicator).
 *
 * Add ONCE to app.component.html:  <perf-response-time></perf-response-time>
 * Toggle with the badge or the configured hotkey (default Alt+Shift+P).
 * While a page is loading the badge shows a spinner; when done it shows
 * the time with a stopwatch (fast/green) or warning sign (amber/red).
 *
 * The "Time Range" column shows the CONSTANT allowed range from
 * config.rowLimits; a row whose actual Total Time exceeds its upper
 * limit is highlighted in red with a warning mark.
 */
@Component({
  selector: 'perf-response-time',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <ng-container *ngIf="monitor.config.enabled">
  <ng-container *ngIf="{ t: monitor.timing$ | async, busy: monitor.measuring$ | async } as vm">

    <!-- floating badge -->
    <button class="prt-badge" *ngIf="vm.t || vm.busy"
            [class.left]="monitor.config.position === 'bottom-left'"
            [ngClass]="vm.busy ? 'measuring' : badgeClass(vm.t)"
            (click)="openDialog(vm.t)"
            title="Page response time – click for details">
      <span *ngIf="vm.busy" class="prt-spin" aria-label="Measuring"></span>
      <span *ngIf="!vm.busy" class="prt-badge-icon">{{ badgeIcon(vm.t) }}</span>
      <ng-container *ngIf="vm.t; else measuringTxt">{{ vm.t.responseTime }} ms</ng-container>
      <ng-template #measuringTxt>&#8230;</ng-template>
    </button>

    <!-- dialog -->
    <div class="prt-overlay" *ngIf="open && vm.t as t" (click)="open = false">
      <div class="prt-dialog" role="dialog" aria-label="Browser response time"
           (click)="$event.stopPropagation()">

        <div class="prt-header">
          <h2>Browser response time</h2>
          <button class="prt-close" aria-label="Close" (click)="open = false">&#10005;</button>
        </div>

        <div class="prt-body">
          <div class="prt-summary">
            Response time(ms): {{ t.responseTime }}, Network: {{ t.network }},
            Server: {{ t.server }}, Browser: {{ t.browser }}
          </div>

          <!-- stacked proportion bar -->
          <div class="prt-bar">
            <div class="seg network" [style.width.%]="pct(t, t.network)"></div>
            <div class="seg server"  [style.width.%]="pct(t, t.server)"></div>
            <div class="seg browser" [style.width.%]="pct(t, t.browser)"></div>
          </div>

          <!-- main timing table -->
          <table class="prt-table">
            <thead>
              <tr>
                <th class="c-type">Timing Type</th>
                <th class="c-range">Time Range</th>
                <th class="c-total">Total Time</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of t.rows"
                  [class.over]="isOverLimit(r)"
                  [title]="overTitle(r)">
                <td class="c-type">
                  <span class="prt-chip" [ngClass]="r.color"></span>{{ r.label }}
                </td>
                <td class="c-range">{{ rangeText(r) }}</td>
                <td class="c-total">
                  {{ r.total }}ms<span *ngIf="isOverLimit(r)" class="prt-over-mark">&#9888;</span>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- browser timing detail -->
          <div class="prt-detail" *ngIf="t.detail.length">
            <div class="prt-detail-head">
              <span>Browser timing detail</span>
              <span>Time</span>
            </div>
            <div class="prt-detail-row" *ngFor="let d of t.detail">
              <span class="lbl">{{ d.label }}</span>
              <span class="val">{{ d.timeMs }} ms</span>
            </div>
          </div>

          <div class="prt-foot">
            Page: {{ t.page }} &nbsp;&bull;&nbsp;
            {{ t.kind === 'full' ? 'Full page load' : 'In-app navigation' }} &nbsp;&bull;&nbsp;
            {{ t.capturedAt | date:'HH:mm:ss' }}
          </div>
        </div>
      </div>
    </div>
  </ng-container>
  </ng-container>
  `,
  styles: [`
    :host { font-family: "Segoe UI", Helvetica, Arial, sans-serif; }

    /* ---------- badge ---------- */
    .prt-badge {
      position: fixed; bottom: 14px; right: 14px; z-index: 99990;
      border: none; border-radius: 14px; padding: 4px 12px 4px 9px;
      font-size: 12px; font-weight: 600; color: #fff; cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,.28); letter-spacing: .2px;
    }
    .prt-badge.left { right: auto; left: 14px; }
    .prt-badge-icon { margin-right: 5px; font-weight: 400; }
    .prt-badge.good     { background: #3d8f3d; }
    .prt-badge.moderate { background: #d98a00; }
    .prt-badge.slow     { background: #c3362b; }
    .prt-badge.measuring { background: #5d6c77; }

    .prt-spin {
      display: inline-block; width: 11px; height: 11px; margin-right: 6px;
      border: 2px solid rgba(255,255,255,.35); border-top-color: #fff;
      border-radius: 50%; vertical-align: -2px;
      animation: prtSpin .7s linear infinite;
    }
    @keyframes prtSpin { to { transform: rotate(360deg); } }

    /* ---------- overlay / dialog ---------- */
    .prt-overlay {
      position: fixed; inset: 0; z-index: 99991;
      background: rgba(15, 15, 30, .45);
      display: flex; align-items: flex-start; justify-content: center;
    }
    .prt-dialog {
      margin-top: 9vh; width: 700px; max-width: 94vw; max-height: 82vh;
      overflow: auto; background: #fff; border-radius: 10px;
      box-shadow: 0 12px 40px rgba(0,0,0,.35);
      animation: prtIn .12s ease-out;
    }
    @keyframes prtIn { from { transform: translateY(-8px); opacity: 0; } }

    .prt-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px 12px; border-bottom: 1px solid #e0e0e0;
    }
    .prt-header h2 {
      margin: 0; font-size: 19px; font-weight: 700; color: #2e2e3a;
    }
    .prt-close {
      border: none; background: none; font-size: 15px; color: #5a5a68;
      cursor: pointer; padding: 4px 6px; line-height: 1;
    }
    .prt-close:hover { color: #1c1c28; }

    .prt-body { padding: 14px 20px 16px; }

    .prt-summary { font-size: 13.5px; color: #2e2e3a; margin-bottom: 8px; }

    /* ---------- stacked bar ---------- */
    .prt-bar {
      display: flex; height: 10px; width: 100%; overflow: hidden;
      border-radius: 2px; background: #eceff1; margin-bottom: 16px;
    }
    .seg.network { background: #e3554f; }
    .seg.server  { background: #f5b73d; }
    .seg.browser { background: #4eb7a8; }

    /* ---------- main table ---------- */
    .prt-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    .prt-table th {
      text-align: left; font-weight: 700; color: #2e2e3a;
      padding: 6px 4px; border-bottom: 1px solid #d8d8de;
    }
    .prt-table td { padding: 5px 4px; color: #2e2e3a; }
    .prt-table .c-type  { width: 42%; font-weight: 700; }
    .prt-table .c-range { width: 33%; }
    .prt-table td.c-range, .prt-table td.c-total { font-weight: 400; }

    /* row exceeding its configured upper limit */
    .prt-table tr.over td { color: #c3362b; background: #fdf0ef; }
    .prt-table tr.over td.c-total { font-weight: 700; }
    .prt-over-mark { margin-left: 6px; font-size: 12px; }

    .prt-chip {
      display: inline-block; width: 7px; height: 17px; margin-right: 9px;
      vertical-align: -3px; border-radius: 1px;
    }
    .prt-chip.network { background: #e3554f; }
    .prt-chip.server  { background: #f5b73d; }
    .prt-chip.browser { background: #4eb7a8; }

    /* ---------- detail section ---------- */
    .prt-detail { margin-top: 18px; font-size: 13.5px; }
    .prt-detail-head {
      display: flex; justify-content: space-between; font-weight: 700;
      color: #2e2e3a; padding: 6px 4px; border-bottom: 1px solid #d8d8de;
    }
    .prt-detail-row {
      display: flex; justify-content: space-between; padding: 6px 4px;
      color: #2e2e3a;
    }
    .prt-detail-row:hover { background: #ece4f2; }
    .prt-detail-row .lbl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .prt-detail-row .val { flex-shrink: 0; margin-left: 16px; }

    .prt-foot {
      margin-top: 14px; padding-top: 10px; border-top: 1px solid #ececf1;
      font-size: 11.5px; color: #84848f;
    }
  `]
})
export class ResponseTimeIndicatorComponent {

  open = false;

  constructor(public monitor: PerformanceMonitorService) {}

  @HostListener('document:keydown', ['$event'])
  onKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') { this.open = false; return; }
    if (this.matchesHotkey(ev)) {
      ev.preventDefault();
      this.open = !this.open && !!this.monitor.timing$.value;
    }
  }

  /** Open the dialog (only when a measurement exists). */
  openDialog(t: PageTiming | null): void {
    if (t) { this.open = true; }
  }

  /**
   * Time Range column: the CONSTANT allowed range from config.rowLimits.
   * Falls back to the measured range if no limit is configured.
   */
  rangeText(r: TimingRow): string {
    const lim = this.monitor.config.rowLimits[r.label];
    return lim
      ? lim.from + '-' + lim.to + 'ms'
      : r.start + '-' + r.end + 'ms';
  }

  /** True when the row's actual Total Time exceeds its constant upper limit. */
  isOverLimit(r: TimingRow): boolean {
    const lim = this.monitor.config.rowLimits[r.label];
    return lim !== undefined && r.total > lim.to;
  }

  /** Tooltip explaining the exceeded limit. */
  overTitle(r: TimingRow): string {
    const lim = this.monitor.config.rowLimits[r.label];
    return lim && this.isOverLimit(r)
      ? r.label + ' exceeded the allowed range: ' + r.total + 'ms > ' + lim.to + 'ms'
      : '';
  }

  /** Matches config.hotkey, e.g. 'alt+shift+p'. */
  private matchesHotkey(ev: KeyboardEvent): boolean {
    const hk = (this.monitor.config.hotkey || '').toLowerCase();
    if (!hk || !ev.key) { return false; }
    const parts = hk.split('+').map(p => p.trim());
    const key = parts[parts.length - 1];
    return ev.key.toLowerCase() === key
      && ev.altKey === (parts.indexOf('alt') >= 0)
      && ev.ctrlKey === (parts.indexOf('ctrl') >= 0)
      && ev.shiftKey === (parts.indexOf('shift') >= 0);
  }

  /** Segment width %, with a 2% floor so tiny values stay visible. */
  pct(t: PageTiming, value: number): number {
    if (!t.responseTime || value <= 0) { return 0; }
    return Math.max((value / t.responseTime) * 100, 2);
  }

  badgeClass(t: PageTiming | null): string {
    if (!t) { return 'measuring'; }
    const th = this.monitor.config.thresholds;
    if (t.responseTime <= th.good) { return 'good'; }
    if (t.responseTime <= th.moderate) { return 'moderate'; }
    return 'slow';
  }

  /** Stopwatch when fast (green), warning sign when moderate/slow. */
  badgeIcon(t: PageTiming | null): string {
    return this.badgeClass(t) === 'good' ? '⏱' : '⚠';
  }
}
