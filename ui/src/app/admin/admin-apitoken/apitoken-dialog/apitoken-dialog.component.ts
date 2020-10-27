import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';

import { APIService } from 'app/services/api/api.service';

@Component({
	selector: 'app-apitoken-dialog',
	templateUrl: './apitoken-dialog.html',
	styleUrls: ['./apitoken-dialog.css']
})
export class APITokenDialogComponent {
	public token: string;

	constructor(@Inject(MAT_DIALOG_DATA) public data: any,
				public dialogRef: MatDialogRef<APITokenDialogComponent>, private api: APIService) {
		this.token = <string>data.token;
	}
	public close() {
		this.dialogRef.close();
	}
}
