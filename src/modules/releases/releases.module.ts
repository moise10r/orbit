import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReleasesService } from './releases.service';
import { ReleasesController, ReleaseBadgesController } from './releases.controller';
import { Release } from './entities/release.entity';
import { Deployment } from './entities/deployment.entity';
import { Environment } from './entities/environment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Release, Deployment, Environment])],
  providers: [ReleasesService],
  controllers: [ReleasesController, ReleaseBadgesController],
  exports: [ReleasesService, TypeOrmModule],
})
export class ReleasesModule {}

