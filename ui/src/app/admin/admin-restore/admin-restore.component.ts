import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource, MatSnackBar, MatPaginator, MatPaginatorIntl } from '@angular/material';

import { APIService } from 'app/services/api/api.service';
import { Project, AWSCreds } from 'app/services/api/QueryResponses';

@Component({
	selector: 'app-admin-restore',
	templateUrl: './admin-restore.html',
	styleUrls: ['./admin-restore.css']
})
export class AdminRestoreComponent implements OnInit {
	public restoreType: string = "";
	public recoveryKey: string = "";
	public hasProjects: boolean = false;
	public projectSelected: boolean = false;
	public backupIsConfigured: boolean = false;
	public displayedColumns = ['Name', 'AddToBackup'];
	public dataSource = new MatTableDataSource<Project>();
	public projectsToRestore: string[] = [];

	@ViewChild(MatPaginator, { static: false })
	public paginator: MatPaginator;

	constructor(public api: APIService, private snackBar: MatSnackBar) { }

	ngOnInit() {
		this.api.IsBackupConfigured().subscribe(wellIsIt => {
			this.backupIsConfigured = wellIsIt.data.isBackupConfigured;
		})
		this.api.GetProjectsList(0).subscribe(projects => {
			if (projects.data.projects != null) {
				this.hasProjects = true;
				this.dataSource.data = projects.data.projects;
			}
		});
	}
	public save() {
		this.api.DataRestore(this.restoreType, this.projectsToRestore).subscribe();
	}
	public disableRestoreButton(): boolean {
		if (this.restoreType == "single" && this.projectsToRestore.length == 0) { return true; }
		else return this.restoreType == '' || this.backupIsConfigured == false;
	}
	public backupState(project: string): boolean {
		return false
	}
	public checkChanged(project: string) {
		if (this.projectsToRestore.includes(project, 0)) {
			this.projectsToRestore = this.projectsToRestore.filter(p => p != project);
		} else {
			this.projectsToRestore.push(project);
		}
	}
	public applyFilter(filterValue: string) {
		this.dataSource.filter = filterValue.trim().toLowerCase();
	}
}
