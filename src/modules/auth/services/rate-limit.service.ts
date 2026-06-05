import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class RateLimitService {
    private rates: Map<string, { count: number; lastAccessed: number }> = new Map();

    private readonly MAX_REQUESTS = 5;
    private readonly TIME_WINDOW = 60 * 1000; // 1 minute

    checkRateLimit(request: Request): boolean {
        const key = request.ip; // or any unique identifier, e.g., request.body.username
        const now = Date.now();

        if (!this.rates.has(key)) {
            this.rates.set(key, { count: 1, lastAccessed: now });
            return true;
        }

        const rateInfo = this.rates.get(key);
        if (!rateInfo) return false; // Proper check for undefined

        if (now - rateInfo.lastAccessed > this.TIME_WINDOW) {
            rateInfo.count = 1;
            rateInfo.lastAccessed = now;
            return true;
        }

        if (rateInfo.count < this.MAX_REQUESTS) {
            rateInfo.count++;
            return true;
        }

        return false; // Rate limit exceeded
    }
}