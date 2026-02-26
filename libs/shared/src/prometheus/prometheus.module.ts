import { DynamicModule, Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrometheusModule as WillsotoPrometheusModule } from '@willsoto/nestjs-prometheus';
import { PrometheusInterceptor } from './prometheus.interceptor';
import { MetricsController } from './metrics.controller';

export interface PrometheusModuleOptions {
  serviceName: string;
}

@Global()
@Module({})
export class PrometheusModule {
  static forRoot(options: PrometheusModuleOptions): DynamicModule {
    const { serviceName } = options;
    return {
      module: PrometheusModule,
      imports: [
        WillsotoPrometheusModule.register({
          path: '/metrics',
          defaultMetrics: { enabled: true },
          controller: MetricsController,
        }),
      ],
      providers: [
        {
          provide: APP_INTERCEPTOR,
          useFactory: () => new PrometheusInterceptor(serviceName),
        },
      ],
      exports: [WillsotoPrometheusModule],
    };
  }
}
