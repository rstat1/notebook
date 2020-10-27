import { MatSnackBar, MatTableDataSource, MatPaginator } from '@angular/material';
import { Component, OnInit, ViewChild } from '@angular/core';

import { APIService } from 'app/services/api/api.service';
import { B2Creds, Project, BackupActionDetails } from 'app/services/api/QueryResponses';

@Component({
	selector: 'app-admin-b2',
	templateUrl: './admin-b2.html',
	styleUrls: ['./admin-b2.css']
})
export class AdminB2ConfigComponent implements OnInit {
	public scrollbarOptions = {
		scrollInertia: 0,
		theme: 'dark',
		scrollbarPosition: "inside",
		alwaysShowScrollbar: 0,
		autoHideScrollbar: true,
	};
	public appKey: string = "";
	public appKeyID: string = "";
	public currentBackupList: string[];
	public hasProjects: boolean = false;
	public displayedColumns = ['Name', 'AddToBackup'];
	public dataSource = new MatTableDataSource<Project>();
	@ViewChild(MatPaginator, { static: true })
	public paginator: MatPaginator;

	constructor(public api: APIService, private snackBar: MatSnackBar) { }

	ngOnInit() {
		this.api.GetProjectsList(0).subscribe(projects => {
			if (projects.data.projects != null) {
				this.hasProjects = true;
				this.dataSource.data = projects.data.projects;
			}
		});
		this.api.GetRepoBackupList().subscribe(resp => { this.currentBackupList = resp.data.repoBackupList; });
		// this.api.GetB2Credentials().subscribe(resp => {
		// 	this.appKey = resp.data.b2Credentials.applicationKey;
		// 	this.appKeyID = resp.data.b2Credentials.applicationKeyID
		// });
	}
	public save() {
		let creds: B2Creds = new B2Creds();
		creds.applicationKey = this.appKey;
		creds.applicationKeyID = this.appKeyID;
		// this.api.UpdateB2Creds(creds).subscribe(resp => {
		// 	if (resp.errors != null) {
		// 		this.snackBar.open(resp.errors[0].message, "", {
		// 			duration: 3000, horizontalPosition: "right",
		// 			verticalPosition: "top"
		// 		})
		// 	} else {
		// 		this.snackBar.open("Successfully saved B2 credentials", "", {
		// 			duration: 3000, horizontalPosition: "right",
		// 			verticalPosition: "top"
		// 		})

		// 	}
		// })
	}
	public backupState(project: string): boolean {
		if (this.currentBackupList == null) { return false; }
		return this.currentBackupList.includes(project, 0);
	}
	public checkChanged(project: string) {
		this.api.UpdateBackupList(project).subscribe(resp => {
			if (resp.errors != null) {
				this.snackBar.open(resp.errors[0].message, "", {
					duration: 3000, horizontalPosition: "right",
					verticalPosition: "top"
				});
			}
		});
	}
	public applyFilter(filterValue: string) {
		this.dataSource.filter = filterValue.trim().toLowerCase();
	}
	public triggerBackup() {
		var actionDetails: BackupActionDetails;
		actionDetails.type = "full";
		this.api.TriggerBackup(JSON.stringify(actionDetails)).subscribe();
	}
}
