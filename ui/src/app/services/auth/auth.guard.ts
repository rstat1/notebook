import { Injectable } from "@angular/core";
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, CanLoad, Route, CanActivateChild } from "@angular/router";
import { Observable, of } from "rxjs";
import { map, catchError } from 'rxjs/operators';

import { AuthService } from "app/services/auth/auth.service";
import { environment } from "environments/environment";

@Injectable()
export class AuthGuard implements CanActivate, CanLoad, CanActivateChild {
	constructor(private authService: AuthService, private router: Router) {}

	canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | Observable<boolean> | Promise<boolean> {
		let url = `/${childRoute}`;
		return this.checkLogin(url).pipe(
			map(status => {
				if (status == false) { this.router.navigate(['/auth']); }
				return status;
			}), catchError(e => {return of(false)}))
		}
	canLoad(route: Route): boolean | Observable<boolean> | Promise<boolean> {
		let url = `/${route.path}`;
		return this.checkLogin(url).pipe(
			map(status => {
				if (status == false) { this.router.navigate(['/auth']); }
				return status;
			}), catchError(e => { return of(false); }));
	}
	canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | Observable<boolean> {
		return this.checkLogin(state.url).pipe(
			map(status => {
				if (status == false) { this.router.navigate(['/auth']) }
				return status;
			}), catchError(e => { return of(false); }));

	}
	checkLogin(redirectTo: string): Observable<boolean> {
		this.authService.RedirectURL = redirectTo;
		if (this.authService.IsLoggedIn) {
			return of(true);
		} else if (this.authService.IsLoggedIn == false && this.authService.NoToken == false){
			return this.authService.TokenValidation;
		} else {
			return of(false);
		}
	}
}
@Injectable()
export class RootGuard implements CanActivate, CanLoad, CanActivateChild {
    constructor(private authService: AuthService, private router: Router) {}

    canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | Observable<boolean> | Promise<boolean> {
		return this.checkLogin(state.url).pipe(
			map(status => {
				return this.authService.UserIsRoot;
			}), catchError(e => { return of(false); }))

    }
    canLoad(route: Route): boolean | Observable<boolean> | Promise<boolean> {
        let url = `/${route.path}`;
		return this.checkLogin(url).pipe(
			map(status => {
				return this.authService.UserIsRoot;
			}), catchError(e => { return of(false); }));

    }
    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | Observable<boolean> | Promise<boolean> {
		return this.checkLogin(state.url).pipe(
			map(status => {
				return this.authService.UserIsRoot;
			}), catchError(e => { return of(false); }));
    }
	checkLogin(redirectTo: string): Observable<boolean> {
		this.authService.RedirectURL = redirectTo;
		if (this.authService.IsLoggedIn) {
			return of(true);
		} else if (this.authService.IsLoggedIn == false && this.authService.NoToken == false){
			return this.authService.TokenValidation;
		} else {
			return of(false);
		}
	}
}