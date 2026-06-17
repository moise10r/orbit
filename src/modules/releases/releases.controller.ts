import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReleasesService } from './releases.service';
import {
  CreateReleaseDto, UpdateReleaseDto,
  CreateDeploymentDto, UpdateDeploymentDto,
  ListReleasesQueryDto, CreateEnvironmentDto, UpdateEnvironmentDto,
} from './dto/release.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthRequest {
  user: { workspaceId: string; id: string };
}

@ApiTags('releases')
@Controller('releases')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReleasesController {
  constructor(private readonly svc: ReleasesService) {}

  @Get()
  @ApiOperation({ summary: 'List releases — paginated, filterable by status and version' })
  list(@Request() req: AuthRequest, @Query() query: ListReleasesQueryDto) {
    return this.svc.list(req.user.workspaceId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new release' })
  create(@Request() req: AuthRequest, @Body() dto: CreateReleaseDto) {
    return this.svc.create(req.user.workspaceId, dto, req.user.id);
  }

  // ── Environments (must be before :id to avoid route shadowing) ─────────────

  @Get('environments')
  @ApiOperation({ summary: 'List active environments for the workspace' })
  listEnvironments(@Request() req: AuthRequest) {
    return this.svc.listEnvironments(req.user.workspaceId);
  }

  @Post('environments')
  @ApiOperation({ summary: 'Create a new environment' })
  createEnvironment(@Request() req: AuthRequest, @Body() dto: CreateEnvironmentDto) {
    return this.svc.createEnvironment(req.user.workspaceId, dto);
  }

  @Patch('environments/:id')
  @ApiOperation({ summary: 'Update an environment (name, tier, url, active)' })
  updateEnvironment(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: UpdateEnvironmentDto,
  ) {
    return this.svc.updateEnvironment(req.user.workspaceId, id, dto);
  }

  @Delete('environments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate an environment (soft-delete)' })
  removeEnvironment(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.svc.removeEnvironment(req.user.workspaceId, id);
  }

  // ── Releases ───────────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get a release by ID' })
  findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.svc.findOne(req.user.workspaceId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a release (status, changelog, etc.)' })
  update(@Request() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateReleaseDto) {
    return this.svc.update(req.user.workspaceId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a draft release' })
  remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.svc.remove(req.user.workspaceId, id);
  }

  @Post(':id/deploy')
  @ApiOperation({ summary: 'Deploy a release to an environment' })
  deploy(@Request() req: AuthRequest, @Param('id') id: string, @Body() dto: CreateDeploymentDto) {
    return this.svc.deploy(req.user.workspaceId, id, dto);
  }

  @Patch(':id/deployments/:deployId')
  @ApiOperation({ summary: 'Update deployment status (used by CI/CD pipelines)' })
  updateDeployment(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Param('deployId') deployId: string,
    @Body() dto: UpdateDeploymentDto,
  ) {
    return this.svc.updateDeployment(req.user.workspaceId, id, deployId, dto);
  }

  @Post(':id/rollback')
  @ApiOperation({ summary: 'Roll back a deployed release' })
  rollback(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.svc.rollback(req.user.workspaceId, id);
  }
}
