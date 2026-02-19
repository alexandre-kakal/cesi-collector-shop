import { Module } from '@nestjs/common';
import { ModerationEventsHandler } from './moderation-events.handler';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [ModerationModule],
  controllers: [ModerationEventsHandler],
})
export class EventsModule {}
