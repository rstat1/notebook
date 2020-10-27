import { Component, OnInit, Inject, AfterViewInit } from '@angular/core';
import { MalihuScrollbarService } from 'ngx-malihu-scrollbar';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

import { APIService } from 'app/services/api/api.service';
import { WebSocketClient } from 'app/services/websocket.service';

@Component({
	selector: 'app-status-dialog',
	templateUrl: './status-dialog.html',
	styleUrls: ['./status-dialog.css']
})
export class StatusDialogComponent implements OnInit, AfterViewInit {
	public wsSubject: string;
	public dialogTitle: string;
	public logEntries: string[] = new Array();

	constructor(public dialogRef: MatDialogRef<StatusDialogComponent>, private api: APIService,
		private scrollBar: MalihuScrollbarService, private ws: WebSocketClient,
		@Inject(MAT_DIALOG_DATA) public data: any) {
	}
	ngOnInit() {
		this.dialogTitle = <string>this.data.title;
		this.wsSubject = <string>this.data.subject;
	}
	ngAfterViewInit(): void {
		this.scrollBar.initScrollbar(document.getElementById("logContent"),
			{scrollInertia: 0, theme: 'dark', scrollbarPosition: 'inside', alwaysShowScrollbar: 0,
			autoHideScrollbar: true});

		this.ws.SubscribeToMessage(this.wsSubject, false, (msg) => {
			if (msg.includes("starting")) {
				this.logEntries = new Array();
			}
			this.logEntries.push(msg);
			this.scrollBar.scrollTo(document.getElementById("logContent"), "bottom", {scrollInertia: 0});
		});
	}
}