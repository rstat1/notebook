import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ConfigService } from "app/services/config.service";

@Injectable()
export class AuthTokenInjector implements HttpInterceptor {
	intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
		if (req.url.indexOf("login") && req.url.indexOf("sentry.m") == -1) {
			req = req.clone({ setHeaders: {	Authorization: `Bearer ${ConfigService.GetAccessToken()}` } })
		}
		return next.handle(req);
  	}
}