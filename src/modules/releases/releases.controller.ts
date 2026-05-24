import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { Release, ReleaseEnvironment } from './entities/release.entity';
import { ReleasesService } from './releases.service';

@ApiTags('releases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('releases')
export class ReleasesController {
  constructor(private readonly releases: ReleasesService) {}

  @Post()
  @ApiCreatedResponse({ type: Release })
  create(@Body() dto: CreateReleaseDto, @Request() req: { user: any }) {
    return this.releases.create(dto, req.user);
  }

  @Get()
  @ApiOkResponse({ type: [Release] })
  @ApiQuery({ name: 'serviceId', required: false })
  @ApiQuery({ name: 'environment', enum: ReleaseEnvironment, required: false })
  findAll(
    @Query('serviceId') serviceId?: string,
    @Query('environment') environment?: ReleaseEnvironment,
  ) {
    return this.releases.findAll(serviceId, environment);
  }

  @Get(':id')
  @ApiOkResponse({ type: Release })
  findOne(@Param('id') id: string) {
    return this.releases.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: Release })
  update(@Param('id') id: string, @Body() dto: UpdateReleaseDto) {
    return this.releases.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(@Param('id') id: string) {
    return this.releases.remove(id);
  }
}
