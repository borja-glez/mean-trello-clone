import { HttpEvent, HttpHandler, HttpHeaders, HttpInterceptor, HttpParams, HttpRequest, HttpResponse } from "@angular/common/http";
import { ApplicationRef, Injectable } from "@angular/core";
import { makeStateKey, TransferState } from "@angular/platform-browser";

import { Observable, of } from 'rxjs';
import { filter, take, tap } from 'rxjs/operators';
import { uri } from "../graphql.module";

interface TransferHttpResponse {
  body?: any | null;
  headers?: HttpHeaders;
  status?: number;
  statusText?: string;
  url?: string;
}

@Injectable()
export class ApolloTransferHttpCacheInterceptor implements HttpInterceptor {
  private isCacheActive = true;

  constructor(appRef: ApplicationRef, private transferState: TransferState) {
    // Stop using the cache if the application has stabilized, indicating initial rendering is
    // complete.
    appRef.isStable
      .pipe(
        filter((isStable) => isStable),
        take(1),
        tap(() => (this.isCacheActive = false)),
      )
      .subscribe();
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isCacheActive || !['POST'].includes(req.method) || req.url !== uri || !req.body.operationName) {
      // Cache is no longer active. Pass the request through.
      return next.handle(req);
    }

    const storeKey = makeStateKey(req.body.operationName);

    if (this.transferState.hasKey(storeKey)) {
      // Request found in cache. Respond using it.
      const response = this.transferState.get<TransferHttpResponse>(storeKey, {});
      return of(
        new HttpResponse<any>({
          body: response.body,
          headers: response.headers,
          status: response.status,
          statusText: response.statusText,
          url: response.url,
        }),
      );
    }

    // Request not found in cache. Make the request and cache it.
    const httpEvent = next.handle(req);

    return httpEvent.pipe(
      tap((event: HttpEvent<unknown>) => {
        if (event instanceof HttpResponse) {
          this.transferState.set<TransferHttpResponse>(storeKey, {
            body: event.body,
            headers: event.headers,
            status: event.status,
            statusText: event.statusText,
            url: event.url ?? '',
          });
        }
      }),
    );
  }
}
