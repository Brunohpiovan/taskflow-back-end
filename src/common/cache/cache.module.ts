import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';

@Global()
@Module({
    imports: [
        NestCacheModule.register({
            isGlobal: true,
            ttl: 5000, // 5 seconds default TTL
            max: 100, // maximum number of items in cache
        }),
    ],
    exports: [NestCacheModule],
})
export class CacheModule { }
