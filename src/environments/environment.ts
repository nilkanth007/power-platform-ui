import { PERF_MONITOR_CONFIG } from '../app/performance-monitor/perf-monitor.config';

export const environment = {
  production: false,
  apiUrl: 'https://localhost:55280/api',
  perfMonitor: { ...PERF_MONITOR_CONFIG, enabled: true }
};
