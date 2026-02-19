import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { CategoryModule } from './category/category.module';
import { ListingModule } from './listing/listing.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/listing/.env',
    }),
    PrismaModule,
    CategoryModule,
    ListingModule,
    EventsModule,
  ],
})
export class AppModule {}
