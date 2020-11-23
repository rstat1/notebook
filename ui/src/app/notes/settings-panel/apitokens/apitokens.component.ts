import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material';

import { APIService } from 'app/services/api/api.service';
import { APIToken, DeleteAPITokenRequest, NewAPITokenRequest } from 'app/services/api/QueryResponses';
import { AuthService } from 'app/services/auth/auth.service';

@Component({
	selector: 'settings-api-tokens',
	templateUrl: './apitokens.component.html',
	styleUrls: ['./apitokens.component.css']
})
export class APITokensComponent implements OnInit {
	public apiToken: string = "";
	public scopes: string[] = [];
	public description: string = "";
	public gotToken: boolean = false;
	public hasActiveTokens: boolean = false;
	public saveButtonEnabled: boolean = false;
	public dataSource = new MatTableDataSource<APIToken>();
	public noTokensMessage: string = "User has no active API tokens";
	public displayedColumns = ['Name', "Created", "Scopes", "Action"];
	public scrollbarOptions = { scrollInertia: 0, theme: 'dark', scrollbarPosition: "inside", alwaysShowScrollbar: 0, autoHideScrollbar: true };

	constructor(public auth: AuthService, public api: APIService) { }

	ngOnInit(): void {
		this.getTokens();
	}
	public clearAPIToken() {
		this.apiToken = "";
		this.gotToken = false;
	}
	public save() {
		let newToken: NewAPITokenRequest = new NewAPITokenRequest(this.scopes.join(','), this.description);
		this.api.NewAPIToken(newToken).subscribe(resp => {
			if (resp.status == "success") {
				this.gotToken = true;
				this.apiToken = JSON.parse(resp.response);
				this.getTokens();
			}
		});
	}
	public deleteToken(id: string) {
		let delTokenReq: DeleteAPITokenRequest = new DeleteAPITokenRequest(id, this.auth.getUsername())
		this.api.DeleteAPIToken(id, this.auth.getUsername()).subscribe(resp => {
			if (resp.status == "success") {
				this.getTokens();
			}
		});
	}
	public scopeChanged(name: string) {
		if (this.scopes.includes(name)) {
			this.scopes.splice(this.scopes.indexOf(name), 1);
		} else {
			this.scopes.push(name);
		}
	}
	public getSaveButtonState(): boolean {
		return !(this.description != "" && this.scopes.length > 0);
	}
	private getTokens() {
		this.api.GetAPITokens().subscribe(resp => {
			if (resp.status == "success") {
				var tokens = JSON.parse(resp.response);
				if (tokens != null) {
					this.dataSource = tokens;
					this.hasActiveTokens = true;
				}
			}
		}, error => { this.noTokensMessage = "Failed to get token list: " + error });
	}
}
