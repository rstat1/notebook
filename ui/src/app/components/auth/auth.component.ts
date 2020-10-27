import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

import { APIService } from 'app/services/api/api.service';
import { AuthService } from 'app/services/auth/auth.service';
import { ActivatedRoute } from '@angular/router';

@Component({
	selector: 'app-login',
	template: ``
})
export class AuthComponent implements OnInit {
	ngOnInit(): void {
	}
	private getServicesSub: Subscription;
	private thisIsReallyDumb: Subscription;
	private superDuperDumb: Subscription;

	constructor(private api: APIService, private auth: AuthService, private route: ActivatedRoute) {
		let hasAuthCode: boolean = window.location.toString().includes("authcode");
		if (hasAuthCode == false) {
			this.auth.doAuthRequest("", "", "", false);
		} else if (hasAuthCode) {
			this.thisIsReallyDumb = this.route.url.subscribe(whyIsThisSoDumb => {
				if (whyIsThisSoDumb.length > 0) {
					if (whyIsThisSoDumb[0].path == "auth") {
						this.superDuperDumb = this.route.queryParams.subscribe(yUSoDumb => {
							this.auth.getToken(yUSoDumb["code"]);
						});
					}
				}
			});
		}
	}
}