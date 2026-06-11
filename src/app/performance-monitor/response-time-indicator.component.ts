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
  templateUrl: './response-time-indicator.component.html',
  styleUrls: ['./response-time-indicator.component.css']
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
