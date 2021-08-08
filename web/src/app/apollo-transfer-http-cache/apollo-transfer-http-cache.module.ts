import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { BrowserTransferStateModule } from '@angular/platform-browser';
import { ApolloTransferHttpCacheInterceptor } from './apollo-transfer-http-cache.interceptor';

@NgModule({
  imports: [BrowserTransferStateModule],
  providers: [
    ApolloTransferHttpCacheInterceptor,
    {
      provide: HTTP_INTERCEPTORS,
      useExisting: ApolloTransferHttpCacheInterceptor,
      multi: true,
    },
  ],
})
export class ApolloTransferHttpCacheModule {}
