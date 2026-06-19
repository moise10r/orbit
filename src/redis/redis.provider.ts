import { Provider } from '@nestjs/common';
const Redis = require('ioredis');
const genericPool = require('generic-pool');

export const REDIS_POOL = 'REDIS_POOL';

export const RedisProvider: Provider = {
  provide: REDIS_POOL,
  useFactory: async () => {
    // Config: fallback to env, then to reasonable defaults
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379;
    const redisPassword = process.env.REDIS_PASSWORD || undefined;
    const redisDb = process.env.REDIS_DB ? parseInt(process.env.REDIS_DB, 10) : 0;
    const poolMax = process.env.REDIS_POOL_MAX ? parseInt(process.env.REDIS_POOL_MAX, 10) : 10;
    const poolMin = process.env.REDIS_POOL_MIN ? parseInt(process.env.REDIS_POOL_MIN, 10) : 2;

    const factory = {
      create: async () => {
        return new Redis({
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          db: redisDb,
        });
      },
      destroy: async (client: any) => {
        await client.quit();
      },
    };
    const opts = {
      max: poolMax,
      min: poolMin,
    };
    const pool: any = genericPool.createPool(factory, opts);
    return pool;
  },
};
