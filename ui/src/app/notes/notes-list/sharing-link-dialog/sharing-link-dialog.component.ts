import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

@Component({
	selector: 'app-sharing-link-dialog',
	templateUrl: './sharing-link-dialog.component.html',
	styleUrls: ['./sharing-link-dialog.component.css']
})
export class SharingLinkDialogComponent {
	public pageTitle: string;
	public sharedPageURL: string;

	constructor(public dialogRef: MatDialogRef<SharingLinkDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {
		this.pageTitle = data.pageTitle;
		this.sharedPageURL = window.location.protocol + "//" + window.location.host + "/shared/" + data.sharedPageURL;
	}
	public close() {
		this.dialogRef.close();
	}
}
