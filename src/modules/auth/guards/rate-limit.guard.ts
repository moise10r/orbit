import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RateLimitGuard implements NestMiddleware {
    private requests: { [key: string]: number } = {};
    private requestLimit: number = 100; // max requests per time frame
    private timeFrame: number = 60000; // time frame in ms (1 minute)

    use(req: Request, res: Response, next: NextFunction) {
        const key = req.ip; // or req.body.username for user-based limiting
        const now = Date.now();
        const requestCount = this.requests[key] || 0;

        if (requestCount >= this.requestLimit) {
            return res.status(429).send('Too Many Requests');
        }

        this.requests[key] = requestCount + 1;

        // Clear previous timeout if exists
        if (this.requests[key] === 1) {
            setTimeout(() => {
                delete this.requests[key];
            }, this.timeFrame);
        }

        next();
    }

    resetRequests(key: string) {
        delete this.requests[key];
    }
}