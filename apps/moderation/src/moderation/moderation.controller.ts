import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { ModerationService } from './moderation.service';
import { RejectListingDto } from './dto/reject-listing.dto';
import { Roles, RolesGuard, Role, CurrentUser, RequestUser } from '@app/shared';

@Controller('api/v1/moderation')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('queue')
  getQueue() {
    return this.moderationService.getQueue();
  }

  @Get('logs')
  getLogs() {
    return this.moderationService.getLogs();
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: RequestUser, @Req() req: Request) {
    return this.moderationService.approve(id, user.id, req.ip);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectListingDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.moderationService.reject(id, user.id, dto, req.ip);
  }
}
