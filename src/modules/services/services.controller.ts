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
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Service } from './entities/service.entity';
import { ServicesService } from './services.service';

@ApiTags('services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services')
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Post()
  @ApiCreatedResponse({ type: Service })
  create(@Body() dto: CreateServiceDto, @Request() req: { user: any }) {
    return this.services.create(dto, req.user);
  }

  @Get()
  @ApiOkResponse({ type: [Service] })
  findAll(@Request() req: { user: any }) {
    return this.services.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOkResponse({ type: Service })
  findOne(@Param('id') id: string) {
    return this.services.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: Service })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
    @Request() req: { user: any },
  ) {
    return this.services.update(id, dto, req.user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  remove(@Param('id') id: string, @Request() req: { user: any }) {
    return this.services.remove(id, req.user);
  }
}
