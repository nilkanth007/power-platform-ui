import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { PerfMonitorConfig } from './perf-monitor.config';
import { PerfTimingInterceptor } from './perf-timing.interceptor';
import { PERF_MONITOR_SETTINGS } from './performance-monitor.service';
import { ResponseTimeIndicatorComponent } from './response-time-indicator.component';

/**
 * One-time setup (see README.md):
 *
 *   imports: [ PerformanceMonitorModule.forRoot(environment.perfMonitor) ]
 *   app.component.html: <perf-response-time></perf-response-time>
 */
@NgModule({
  declarations: [ResponseTimeIndicatorComponent],
  imports: [CommonModule],
  exports: [ResponseTimeIndicatorComponent]
})
export class PerformanceMonitorModule {

  constructor() {
    // Marks how long after navigation start Angular reached bootstrap.
    if (typeof performance !== 'undefined' && performance.mark
        && !performance.getEntriesByName('perfmon:ng-bootstrap').length) {
      performance.mark('perfmon:ng-bootstrap');
    }
  }

  static forRoot(config?: Partial<PerfMonitorConfig>): ModuleWithProviders<PerformanceMonitorModule> {
    return {
      ngModule: PerformanceMonitorModule,
      providers: [
        { provide: PERF_MONITOR_SETTINGS, useValue: config || {} },
        { provide: HTTP_INTERCEPTORS, useClass: PerfTimingInterceptor, multi: true }
      ]
    };
  }
}
