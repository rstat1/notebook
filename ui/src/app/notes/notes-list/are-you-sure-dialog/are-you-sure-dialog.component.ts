import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
	selector: 'app-are-you-sure-dialog',
	templateUrl: './are-you-sure-dialog.component.html',
	styleUrls: ['./are-you-sure-dialog.component.css']
})
export class AreYouSureDialogComponent implements OnInit {
	public name: string = "";
	public deleteType: string = "";
	public enteredName: string;
	public enteredNameProperly: boolean = true;
	public errorMessage: string = "Please enter the name.";
	constructor(public dialogRef: MatDialogRef<AreYouSureDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {
		this.name = <string>data.name;
		this.deleteType = <string>data.deleteType;
	}

	ngOnInit(): void {
	}
	public save() {
		if (this.enteredName == this.name) {
			this.dialogRef.close(true);
			this.enteredNameProperly = true;
		} else {
			this.enteredNameProperly = false;
		}
	}
	public close() {
		this.dialogRef.close();
	}
}
