# Performance Monitor (ServiceNow-style "Browser response time")

A floating badge shows the response time of **every page automatically** —
click it or press **Alt+Shift+P** to open the breakdown dialog
(Network / Server / Browser, timing table, browser timing detail).
Esc or clicking outside closes it.

Verified on this project's stack: Angular 16.2, NgModule, strict templates.

No per-page changes needed: it hooks the Router, the Navigation Timing API
and an HTTP interceptor globally.

## Files

```
perf-monitor.config.ts            <- ALL value ranges / settings live here
perf-monitor.model.ts             <- shared interfaces
performance-monitor.service.ts    <- collects timings (initial load + every route)
perf-timing.interceptor.ts        <- measures API calls = server time
response-time-indicator.component.ts  <- badge + dialog UI
performance-monitor.module.ts     <- one-time wiring
```

## Already wired in this app

- `src/environments/environment.ts` → `perfMonitor: { ...PERF_MONITOR_CONFIG, enabled: true }`
- `src/app/app.module.ts` → `PerformanceMonitorModule.forRoot(environment.perfMonitor)`
- `src/app/app.component.html` → `<perf-response-time></perf-response-time>`

To hide it in production builds, set `enabled: false` in the prod environment.

## Tuning value ranges

Edit `perf-monitor.config.ts` only:

| Setting | Meaning | Default |
|---|---|---|
| `thresholds.good` | badge green up to this many ms | 1000 |
| `thresholds.moderate` | badge amber up to this many ms, red above | 3000 |
| `position` | badge corner | bottom-right |
| `hotkey` | keyboard shortcut to toggle the dialog ('' disables) | alt+shift+p |
| `settleTimeMs` | quiet time after last API/render before a page is "finished" | 1500 |
| `quietCheckIntervalMs` | how often to poll for page idle | 200 |
| `hardCapMs` | max wait before force-finalising a measurement | 30000 |
| `showApiDetail` | list each API call in the detail section | true |
| `maxDetailRows` | max rows in "Browser timing detail" | 8 |
| `excludeUrlPatterns` | URLs ignored by the interceptor | sockjs, signalr… |
| `rowLimits` | allowed max Total Time (ms) per timing-type row; rows over their limit show red with ⚠ | Server 1000, DOM Processing 1000, API calls 2000… |

## How values are measured

**Initial full page load** — W3C Navigation Timing API, same rows as ServiceNow:

| Row | Source |
|---|---|
| Cache/DNS/TCP | `fetchStart → connectEnd` |
| Server | `requestStart → responseEnd` |
| Unload | `unloadEventStart → unloadEventEnd` |
| DOM Processing | `responseEnd → domComplete` |
| onLoad | `loadEventStart → loadEventEnd` |
| API calls (XHR) | HttpClient calls fired during startup |

Summary: `Network = DNS+TCP`, `Server = document + API time (overlaps merged)`,
`Browser = total − network − server`.

**In-app (route) navigations** — measured per page automatically:
router `NavigationStart → NavigationEnd` (guards/resolvers), lazy-chunk
download time (network), merged API-call time (server), remaining time until
the page goes quiet (browser/rendering).

**Browser timing detail** — CSS/JS parse time, first contentful paint,
Angular bootstrap, DOM Content Loaded, and the slowest API calls.
