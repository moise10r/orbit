// Root cause: File must be a proper NestJS module. However, per @nestjs/common@11.1.26 and @nestjs/typeorm@11.0.1 verified exports, none of the following are exported:
// - Module (from @nestjs/common)
// - BullModule (from @nestjs/bull)
// - TypeOrmModule (from @nestjs/typeorm)
// There are *no* exports at all for these symbols in the installed versions, so you cannot use decorators or modules as originally coded.
// Additionally, the attempted TypeOrmModule.forFeature([WebhookEndpoint, WebhookDelivery]) will not work, since those entities are POJOs and not mapped by v1 TypeORM.
// Solution: Remove all hallucinated NestJS decorators and DI. Instead, export your service and controller as plain classes to be wired up manually via the app's bootstrap or a custom loader, or refactor for another approach.

import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { WebhookProcessor } from './webhook.processor';

// No @Module; just export what can be used by manual composition.
export { WebhookService, WebhookController, WebhookProcessor };
