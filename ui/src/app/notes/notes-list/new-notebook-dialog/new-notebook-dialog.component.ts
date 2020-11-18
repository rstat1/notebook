import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DataCacheService } from 'app/services/data-cache.service';

@Component({
	selector: 'app-new-notebook-dialog',
	templateUrl: './new-notebook-dialog.component.html',
	styleUrls: ['./new-notebook-dialog.component.css']
})
export class NewNotebookDialogComponent implements OnInit {
	public enteredName: string = "";
	public enteredNameProperly: boolean = true;
	public errorMessage: string = " already exists. Pick another name.";

	constructor(public dialogRef: MatDialogRef<NewNotebookDialogComponent>, private cache: DataCacheService) { }

	ngOnInit(): void {
	}
	public save() {
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
	}
	public close() {
		this.dialogRef.close("");
	}
}
