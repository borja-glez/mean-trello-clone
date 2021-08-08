import { InjectionToken, NgModule } from '@angular/core';
import { APOLLO_OPTIONS } from 'apollo-angular';
import { InMemoryCache } from '@apollo/client/core';
import { HttpLink } from 'apollo-angular/http';
import { TransferHttpCacheModule } from '@nguniversal/common';
import { ApolloTransferHttpCacheModule } from './apollo-transfer-http-cache/apollo-transfer-http-cache.module';

export const uri = 'http://localhost:8080/server/graphql';
const APOLLO_CACHE = new InjectionToken<InMemoryCache>('apollo-cache');

@NgModule({
  imports: [
    TransferHttpCacheModule,
    ApolloTransferHttpCacheModule
  ],
  providers: [
    {
      provide: APOLLO_CACHE,
      useValue: new InMemoryCache(),
    },
    {
      provide: APOLLO_OPTIONS,
      useFactory(httpLink: HttpLink, cache: InMemoryCache) {
        return {
          link: httpLink.create({uri}),
          cache,
        };
      },
      deps: [HttpLink, APOLLO_CACHE],
    },
  ],
})
export class GraphQLModule {}
