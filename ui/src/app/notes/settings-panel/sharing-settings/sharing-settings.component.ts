import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material';
import { APIService } from 'app/services/api/api.service';
import { SharedPage } from 'app/services/api/QueryResponses';

@Component({
	selector: 'settings-sharing',
	templateUrl: './sharing-settings.component.html',
	styleUrls: ['./sharing-settings.component.css']
})
export class SharingSettingsComponent implements OnInit {
	public hasSharedPages: boolean;
	public dataSource = new MatTableDataSource<SharedPage>();
	public noTokensMessage: string = "User has shared 0 pages";
	public displayedColumns = ['Page Title', "Sharing URL", "Action"];
	public scrollbarOptions = { scrollInertia: 0, theme: 'dark', scrollbarPosition: "inside", alwaysShowScrollbar: 0, autoHideScrollbar: true };

	constructor(public api: APIService) { }

	ngOnInit(): void {
		this.getSharedPages();
	}
	public disableSharing(sharedPageID: string) {
		this.api.UnsharePage(sharedPageID).subscribe(resp => {
			this.getSharedPages();
		}, error => { });
	}
	public getSharingURL(accessToken: string): string {
		return window.location.protocol + "//" + window.location.host + "/shared/" + accessToken;
	}
	private getSharedPages() {
		this.api.GetSharedPages().subscribe(resp => {
			var pages = JSON.parse(resp.response);
			if (pages != null) {
				this.dataSource = pages;
				this.hasSharedPages = true;
			} else {
				this.dataSource = null;
				this.hasSharedPages = false;
			}
		});
	}
}
