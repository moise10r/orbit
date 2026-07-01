import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  UseGuards, Request, HttpCode, HttpStatus, Header,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReleasesService } from './releases.service';
import {
  CreateReleaseDto, UpdateReleaseDto,
  CreateDeploymentDto, UpdateDeploymentDto,
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
  @ApiOperation({ summary: 'List all releases for the workspace' })
  list(@Request() req: AuthRequest) {
    return this.svc.list(req.user.workspaceId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new release' })
  create(@Request() req: AuthRequest, @Body() dto: CreateReleaseDto) {
    return this.svc.create(req.user.workspaceId, dto, req.user.id);
  }

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
  deploy(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: CreateDeploymentDto,
  ) {
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

  @Get('environments')
  @ApiOperation({ summary: 'List environments for the workspace' })
  listEnvironments(@Request() req: AuthRequest) {
    return this.svc.listEnvironments(req.user.workspaceId);
  }

  @Post('environments')
  @ApiOperation({ summary: 'Create a new environment' })
  createEnvironment(
    @Request() req: AuthRequest,
    @Body() body: { name: string; tier: string; url?: string },
  ) {
    return this.svc.createEnvironment(req.user.workspaceId, body.name, body.tier, body.url);
  }
}

// ── Badge helpers ────────────────────────────────────────────────────────────

const BADGE_COLORS: Record<string, string> = {
  success:     '#4c1',
  running:     '#007ec6',
  failed:      '#e05d44',
  rolled_back: '#dfb317',
  pending:     '#9f9f9f',
};

const BADGE_STATUS_LABELS: Record<string, string> = {
  success:     'deployed',
  running:     'deploying',
  failed:      'failed',
  rolled_back: 'rolled back',
  pending:     'pending',
};

function buildBadgeSvg(label: string, message: string, color: string): string {
  const PAD = 10;
  const lw = Math.ceil(label.length * 6.2) + PAD;
  const rw = Math.ceil(message.length * 6.2) + PAD;
  const tw = lw + rw;
  const lx = Math.round((lw / 2 + 1) * 10);
  const rx = Math.round((lw + rw / 2 - 1) * 10);
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const l = esc(label);
  const m = esc(message);
  const ltl = (lw - PAD) * 10;
  const rtl = (rw - PAD) * 10;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="20">`,
    `<linearGradient id="s" x2="0" y2="100%">`,
    `<stop offset="0" stop-color="#bbb" stop-opacity=".1"/>`,
    `<stop offset="1" stop-opacity=".1"/>`,
    `</linearGradient>`,
    `<clipPath id="r"><rect width="${tw}" height="20" rx="3" fill="#fff"/></clipPath>`,
    `<g clip-path="url(#r)">`,
    `<rect width="${lw}" height="20" fill="#555"/>`,
    `<rect x="${lw}" width="${rw}" height="20" fill="${color}"/>`,
    `<rect width="${tw}" height="20" fill="url(#s)"/>`,
    `</g>`,
    `<g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="110">`,
    `<text x="${lx}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${ltl}" lengthAdjust="spacing">${l}</text>`,
    `<text x="${lx}" y="140" transform="scale(.1)" textLength="${ltl}" lengthAdjust="spacing">${l}</text>`,
    `<text x="${rx}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${rtl}" lengthAdjust="spacing">${m}</text>`,
    `<text x="${rx}" y="140" transform="scale(.1)" textLength="${rtl}" lengthAdjust="spacing">${m}</text>`,
    `</g>`,
    `</svg>`,
  ].join('');
}

// ── Public badge controller (no auth) ────────────────────────────────────────

@ApiTags('releases')
@Controller('releases/environments')
export class ReleaseBadgesController {
  constructor(private readonly svc: ReleasesService) {}

  @Get(':envId/badge.svg')
  @Header('Content-Type', 'image/svg+xml')
  @Header('Cache-Control', 'no-cache, max-age=0')
  @ApiOperation({ summary: 'Public embeddable SVG status badge for an environment (no auth required)' })
  async badge(@Param('envId') envId: string): Promise<string> {
    const { env, latestDeployment } = await this.svc.getEnvironmentBadgeData(envId);

    if (!env) {
      return buildBadgeSvg('orbit', 'not found', '#9f9f9f');
    }

    if (!latestDeployment) {
      return buildBadgeSvg(env.name, 'no deployments', '#9f9f9f');
    }

    const statusLabel = BADGE_STATUS_LABELS[latestDeployment.status] ?? latestDeployment.status;
    const version = latestDeployment.release?.version;
    const message = version ? `${statusLabel} v${version}` : statusLabel;
    const color = BADGE_COLORS[latestDeployment.status] ?? '#9f9f9f';

    return buildBadgeSvg(env.name, message, color);
  }
}

// ── Public stats controller (no auth) ────────────────────────────────────────

@ApiTags('releases')
@Controller('releases')
export class ReleasesStatsController {
  constructor(private readonly svc: ReleasesService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Deployment statistics across all environments (no auth required)' })
  getStats() {
    return this.svc.getDeploymentStats();
  }
}
