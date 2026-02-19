import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MediaService } from './media.service';
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

@Controller('api/v1/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseGuards(RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid file type'), false);
        }
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: RequestUser,
    @Query('listingId') listingId?: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.mediaService.upload(file, user.id, listingId);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.mediaService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(RolesGuard, OwnershipGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @CheckOwnership('media')
  remove(@Param('id') id: string) {
    return this.mediaService.remove(id);
  }
}
