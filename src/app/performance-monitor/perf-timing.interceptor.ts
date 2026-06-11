import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { PerformanceMonitorService } from './performance-monitor.service';

/**
 * Measures every HttpClient call and reports it to the monitor as
 * "server time". Registered once in the module – nothing to add per page.
 */
@Injectable()
export class PerfTimingInterceptor implements HttpInterceptor {

  constructor(private monitor: PerformanceMonitorService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.monitor.config.enabled || this.isExcluded(req.url)) {
      return next.handle(req);
    }

    const startMs = performance.now();
    this.monitor.notifyRequestStart();

    return next.handle(req).pipe(
      finalize(() => {
        const endMs = performance.now();
        this.monitor.notifyRequestEnd({
          url: req.urlWithParams,
          method: req.method,
          startMs,
          endMs,
          durationMs: endMs - startMs
        });
      })
    );
  }

  private isExcluded(url: string): boolean {
    return this.monitor.config.excludeUrlPatterns
      .some(p => url.indexOf(p) >= 0);
  }
}
