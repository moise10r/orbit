import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { GitHubConnection } from './entities/github-connection.entity';
import { GitHubApiClient } from './github-api.client';
import { GitHubConnectionService } from './github-connection.service';
import { GitHubSyncService } from './github-sync.service';
import { GitHubWebhookService } from './github-webhook.service';
import { GitHubController } from './github.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GitHubConnection]), AuthModule],
  controllers: [GitHubController],
  providers: [
    GitHubConnectionService,
    GitHubWebhookService,
    GitHubSyncService,
    GitHubApiClient,
  ],
  exports: [GitHubConnectionService, GitHubSyncService],
})
export class GitHubModule {}
