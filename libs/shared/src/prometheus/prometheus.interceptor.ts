import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Counter, Histogram, register } from 'prom-client';

@Injectable()
export class PrometheusInterceptor implements NestInterceptor {
  private readonly httpRequestsTotal: Counter<string>;
  private readonly httpRequestDurationSeconds: Histogram<string>;

  constructor(private readonly serviceName: string) {
    try {
      this.httpRequestsTotal = register.getSingleMetric('http_requests_total') as Counter<string> || new Counter({
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'path', 'status', 'service'],
        registers: [register],
      });
    } catch (e) {
      this.httpRequestsTotal = register.getSingleMetric('http_requests_total') as Counter<string>;
    }

    try {
      this.httpRequestDurationSeconds = register.getSingleMetric('http_request_duration_seconds') as Histogram<string> || new Histogram({
        name: 'http_request_duration_seconds',
        help: 'HTTP request duration in seconds',
        labelNames: ['method', 'path', 'status', 'service'],
        buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
        registers: [register],
      });
    } catch (e) {
      this.httpRequestDurationSeconds = register.getSingleMetric('http_request_duration_seconds') as Histogram<string>;
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      path?: string;
      route?: { path: string };
    }>();
    const response = context.switchToHttp().getResponse();
    const method = request.method;
    const path = this.normalizePath(request.url || request.path || '/', request.route?.path);
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const status = String(response.statusCode || 200);
          const duration = (Date.now() - start) / 1000;
          this.record(method, path, status, duration);
        },
        error: (err: { status?: number }) => {
          const status = String(response.statusCode || err?.status || 500);
          const duration = (Date.now() - start) / 1000;
          this.record(method, path, status, duration);
        },
      }),
    );
  }

  private record(
    method: string,
    path: string,
    status: string,
    durationSeconds: number,
  ): void {
    if (this.shouldSkip(path)) return;

    this.httpRequestsTotal.inc({
      method,
      path,
      status,
      service: this.serviceName,
    });
    this.httpRequestDurationSeconds.observe(
      { method, path, status, service: this.serviceName },
      durationSeconds,
    );
  }

  private shouldSkip(path: string): boolean {
    return path === '/metrics' || path === '/health' || path.startsWith('/metrics?');
  }

  private normalizePath(url: string, routePath?: string): string {
    if (routePath) return routePath;
    try {
      const pathname = new URL(url, 'http://localhost').pathname;
      return pathname || '/';
    } catch {
      return '/';
    }
  }
}
