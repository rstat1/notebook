import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DataCacheService } from 'app/services/data-cache.service';

@Component({
	selector: 'app-new-notebook-dialog',
	templateUrl: './new-notebook-dialog.component.html',
	styleUrls: ['./new-notebook-dialog.component.css']
})
export class NamePromptDialogComponent implements OnInit {
	public enteredName: string = "";
	public dialogType: string = "notebook";
	public enteredNameProperly: boolean = true;
	public errorMessage: string = " already exists. Pick another name.";

	constructor(public dialogRef: MatDialogRef<NamePromptDialogComponent>, private cache: DataCacheService,
		@Inject(MAT_DIALOG_DATA) public data: any) { }

	ngOnInit(): void {
		this.dialogType = <string>this.data.dialogType;
	}
	public save() {
		if (this.dialogType == "notebook") {
			this.cache.getNotebookList(false).subscribe(resp => {
				resp.forEach((notebook) => {
					if (notebook.name == this.enteredName) {
						this.enteredNameProperly = false;
					}
				})
				if (this.enteredNameProperly) {
					this.dialogRef.close(this.enteredName);
				}
			})
		} else if (this.dialogType == "tag") {
			this.enteredName = this.enteredName.split(' ').join('-');
			this.cache.getTagList().subscribe(resp => {
				resp.forEach((tag) => {
					if (tag.tagValue == this.enteredName) {
						this.enteredNameProperly = false;
					}
				})
				if (this.enteredNameProperly) {
					this.dialogRef.close(this.enteredName);
				}
			})
		}
	}
	public close() {
		this.dialogRef.close("");
	}
}
