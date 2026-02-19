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
import {
  Roles,
  RolesGuard,
  Role,
  CurrentUser,
  RequestUser,
  Public,
  OwnershipGuard,
  CheckOwnership,
} from '@app/shared';

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
  @Public()
  findAll(@Query() filter: FilterListingDto, @CurrentUser() user?: RequestUser) {
    return this.listingService.findAll(filter, user);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string, @CurrentUser() user?: RequestUser) {
    return this.listingService.findOne(id, user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard, OwnershipGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @CheckOwnership('listing')
  update(@Param('id') id: string, @Body() dto: UpdateListingDto, @CurrentUser() user: RequestUser) {
    return this.listingService.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard, OwnershipGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @CheckOwnership('listing')
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.listingService.remove(id, user);
  }
}
