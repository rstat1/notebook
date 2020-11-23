import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef, MatTabChangeEvent } from '@angular/material';
import { AuthService } from 'app/services/auth/auth.service';
import { APITokensComponent } from 'app/notes/settings-panel/apitokens/apitokens.component';

@Component({
	selector: 'app-settings-panel',
	templateUrl: './settings-panel.component.html',
	styleUrls: ['./settings-panel.component.css']
})
export class SettingsPanelComponent implements OnInit {
	@ViewChild("apiTokenSettings") public apiTokenSettings: APITokensComponent;

	constructor(public dialogRef: MatDialogRef<SettingsPanelComponent>, public auth: AuthService) { }

	ngOnInit(): void {
	}
	public tabChanged(event: MatTabChangeEvent) {
		if (event.index > 0) {
			this.apiTokenSettings.clearAPIToken();
		}
		console.log(event);
	}
	public close() {
		this.dialogRef.close();
	}
}
