import { Module } from '@nestjs/common';
import { ListingEventsHandler } from './listing-events.handler';
import { ListingModule } from '../listing/listing.module';

@Module({
  imports: [ListingModule],
  controllers: [ListingEventsHandler],
})
export class EventsModule {}
