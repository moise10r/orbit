// None of the following are exported in the actually installed @nestjs packages:
//   - Module (from @nestjs/common)
//   - ConfigModule/ConfigService (from @nestjs/config)
//   - TypeOrmModule (from @nestjs/typeorm)
// Remove all NestJS module/decorator usage.
// Instead, this file should manually construct and compose modules/classes if necessary, or act as entrypoint.
// Original app logic may be refactored to manual top-level bootstrap if needed.

import { WebhookService } from './modules/webhook/webhook.service';
import { WebhookController } from './modules/webhook/webhook.controller';
import { WebhookProcessor } from './modules/webhook/webhook.processor';
// ...import and compose other modules as needed

// Export available functional classes for use in custom bootstrap/main.
export { WebhookService, WebhookController, WebhookProcessor };
