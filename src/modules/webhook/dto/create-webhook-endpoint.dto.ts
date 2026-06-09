export class CreateWebhookEndpointDto {
  url: string;
  secret: string;
  events: string[];
  active?: boolean; // will be defaulted in controller/service if missing
}
