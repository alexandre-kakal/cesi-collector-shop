import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ListingService } from './listing.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { FilterListingDto } from './dto/filter-listing.dto';
import { Roles, RolesGuard, Role, CurrentUser, RequestUser } from '@app/shared';

@Controller('api/v1/listings')
export class ListingController {
  constructor(private readonly listingService: ListingService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  create(@Body() dto: CreateListingDto, @CurrentUser() user: RequestUser) {
    return this.listingService.create(dto, user.id);
  }

  @Get()
  findAll(@Query() filter: FilterListingDto) {
    return this.listingService.findAll(filter);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listingService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateListingDto, @CurrentUser() user: RequestUser) {
    return this.listingService.update(id, dto, user.id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.listingService.remove(id);
  }
}
