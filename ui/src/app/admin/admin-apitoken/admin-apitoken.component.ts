import { Component, OnInit } from '@angular/core';
import { MatSnackBar, MatDialog, MatTableDataSource } from '@angular/material';

import { APIService } from 'app/services/api/api.service';
import { APIToken } from 'app/services/api/QueryResponses';
import { AuthService } from 'app/services/auth/auth.service';
import { APITokenDialogComponent } from 'app/admin/admin-apitoken/apitoken-dialog/apitoken-dialog.component';

@Component({
	selector: 'app-admin-apitoken',
	templateUrl: './admin-apitoken.html',
	styleUrls: ['./admin-apitoken.css']
})
export class AdminAPITokenComponent implements OnInit {
	public scrollbarOptions = {
		scrollInertia: 0,
		theme: 'dark',
		scrollbarPosition: "inside",
		alwaysShowScrollbar: 0,
		autoHideScrollbar: true,
	};
	public scopes: string[] = [];
	public description: string = "";
	public hasActiveTokens: boolean = false;
	public saveButtonEnabled: boolean = false;
	public dataSource = new MatTableDataSource<APIToken>();
	public displayedColumns = ['Name', "Created", "Scopes", "Action"];

	constructor(private api: APIService, private snackBar: MatSnackBar, private dialog: MatDialog,
		public auth: AuthService) {}

	ngOnInit() {
		this.api.GetTokens().subscribe(tokens => {
			if (tokens.data.tokens != null) {
				this.dataSource.data = tokens.data.tokens;
				this.hasActiveTokens = true;
			}
		});
	}
	public save() {
		let newToken: APIToken = new APIToken();
		newToken.name = this.description;
		newToken.scopes = this.scopes.join(",");
		this.api.NewAPIToken(newToken).subscribe(resp => {
			if (resp.errors.length > 0) {
				this.snackBar.open(resp.errors[0].message, "", {
					duration: 3000, horizontalPosition: "right",
					verticalPosition: "top"
				})
			} else {
				this.dialog.open(APITokenDialogComponent, {
					width:'500px',
					data: {token: resp.data.newToken.token},
				})
			}
		})
	}
	public deleteToken(name: string) {
		this.api.DeleteAPIToken(name).subscribe(r => {
			if (r.data != null) {
				this.snackBar.open("Deleted token: " + name, "", {
					duration: 3000, horizontalPosition: "right",
					verticalPosition: "top"
				})
				if (r.data.deleteToken.tokens != null) {
					this.dataSource.data = r.data.deleteToken.tokens;
				} else {
					this.hasActiveTokens = false;
				}
			} else {
				this.snackBar.open(r.errors[0].message, "", {
					duration: 3000, horizontalPosition: "right",
					verticalPosition: "top"
				})
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
}