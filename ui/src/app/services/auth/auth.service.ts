import { Subject, Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { Router, NavigationExtras } from '@angular/router';

import * as jwt_decode from 'jwt-decode';
import { environment } from 'environments/environment';
import { ConfigService } from 'app/services/config.service';
import { APIService, APIResponse } from 'app/services/api/api.service';

class SavedAuthDetails {
	public username: string;
	public token: string;
}

@Injectable({
	providedIn: 'root'
})
export class AuthService {
	public CurrentUser: string = "";
	public RedirectURL: string = "";
	public FailureReason: string = "";
	public NoToken: boolean = false;
	public UserIsRoot: boolean = false;
	public IsLoggedIn: boolean = false;
	public AllowRegister: boolean = true;
	public AuthRequestInvalid: boolean = false;
	public AuthSuccess: Observable<boolean>;
	public TokenValidation: Observable<boolean>;
	private authSuccess: Subject<boolean>;
	private tokenValidate: Subject<boolean>;

	constructor(private api: APIService, private router: Router) {
		this.authSuccess = new Subject<boolean>();
		this.tokenValidate = new Subject<boolean>();

		this.AuthSuccess = this.authSuccess.asObservable();
		this.TokenValidation = this.tokenValidate.asObservable();

		this.setSavedToken();
	}
	public async setSavedToken() {
		let token: string = ConfigService.GetAccessToken();
		if (token != "") {
			var resp: APIResponse = await this.api.ValidateToken().toPromise().catch(e => {
				sessionStorage.clear();
				ConfigService.SetAccessToken("");
				this.tokenValidate.next(false);
				return null;
			});
			let decoded = jwt_decode(token);
			if (resp != null && resp.status == "success") {
				this.IsLoggedIn = true;
				this.UserIsRoot = decoded.lvl == "root";
				this.tokenValidate.next(true);
				this.authSuccess.next(true);
			} else {
				this.IsLoggedIn = false;
				this.tokenValidate.next(false);
			}
		} else {
			this.IsLoggedIn = false;
			this.NoToken = true;
			this.tokenValidate.next(false);
		}
	}
	public getUsername(): string {
		return JSON.parse(sessionStorage.getItem("auth")).username;
	}
	public doAuthRequest(username: string, password: string, redirect: string, isNewUser: boolean) {
		if (ConfigService.GetAccessToken() == "") {
			window.location.replace(ConfigService.GetAuthorizeEndpoint());
		} else {
			this.router.navigate(["home"]);
		}
	}
	public getToken(authCode: string) {
		this.api.GetAuthToken(authCode).subscribe(resp => {
			this.handleAPIResponse(false, "home", resp);
		});
	}
	private handleAPIResponse(isNewUser: boolean, redirectTo: string, resp: APIResponse) {
		let decoded = jwt_decode(resp.response);
		ConfigService.SetAccessToken(resp.response);

		if (decoded.exp == null) {
			this.AuthRequestInvalid = true;
			this.CurrentUser = "";
			this.FailureReason = "token not valid.";
		} else {
			this.UserIsRoot = decoded.lvl == "root";
			this.CurrentUser = decoded.sub;

			sessionStorage.setItem("auth", JSON.stringify({username: this.CurrentUser, token: resp.response}));
			this.authSuccess.next(true);
			this.NoToken = false;
		}

		this.FailureReason = "";
		this.IsLoggedIn = true;
		this.AuthRequestInvalid = false;
		this.router.navigate([redirectTo]);
	}
	private handleAPIError(err: any) {
		console.error(err);
		this.AuthRequestInvalid = true;
		this.FailureReason = err.error.response;
	}
}