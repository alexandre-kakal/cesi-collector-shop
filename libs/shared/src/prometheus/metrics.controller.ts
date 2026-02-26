import { Controller, Get, Res } from '@nestjs/common';
import { PrometheusController } from '@willsoto/nestjs-prometheus';
import type { Response } from 'express';

/**
 * Controller Prometheus personnalisé.
 * Le chemin /metrics est défini dans la configuration du PrometheusModule.
 */
@Controller()
export class MetricsController extends PrometheusController {
  @Get()
  override async index(@Res({ passthrough: true }) response: Response) {
    return super.index(response);
  }
}
