import { MatTableDataSource, MatPaginator, MatDialog } from '@angular/material';
import { Component, OnInit, ViewChild } from '@angular/core';

import { APIService } from 'app/services/api/api.service';
import { GitlabProject } from 'app/services/api/QueryResponses';
import { SelectionModel } from '@angular/cdk/collections';
import { StatusDialogComponent } from '../admin-status-dialog/status-dialog.component';
import { environment } from 'environments/environment.prod';

@Component({
	selector: 'app-admin-import',
	templateUrl: './admin-import.html',
	styleUrls: ['./admin-import.css']
})
export class AdminImportComponent {
	@ViewChild(MatPaginator, { static: true })
	public paginator: MatPaginator;
	public scrollbarOptions = {
		scrollInertia: 0,
		theme: 'dark',
		scrollbarPosition: "inside",
		alwaysShowScrollbar: 0,
		autoHideScrollbar: true,
	};
	public isDevOrTest: boolean;
	public error: string = "";
	public username: string = "";
	public token: string = "";
	public instanceURL: string = "";
	public loading: boolean;
	public hasProjects: boolean;
	public dataSource = new MatTableDataSource<GitlabProject>();
	public displayedColumns = ['Action', 'Group', "Name"];
	public selection: SelectionModel<GitlabProject> = new SelectionModel<GitlabProject>(true, []);

	constructor(public api: APIService, private dialog: MatDialog) {
		this.isDevOrTest = environment.production
	}

	public connect() {
		this.error = "";
		this.loading = true;
		this.api.ConnectToGitLab(this.instanceURL, this.token).subscribe(resp => {
			this.loading = false;
			if (resp.data.gitlabInfo != null) {
				this.hasProjects = true;
				this.username = resp.data.gitlabInfo.username;
				this.dataSource.data = resp.data.gitlabInfo.projects;
				this.dataSource.paginator = this.paginator;
			} else {
				if (resp.errors != null) {
					console.log(resp.errors)
					this.loading = false
					this.error = resp.errors[0].message;
				}
			}
		});
	}
	public masterToggle() {
		if (this.isAllSelected()) {
			this.selection.clear();
		} else {
			this.dataSource.data.forEach(row => this.selection.select(row));
		}
	}
	public applyFilter(filterValue: string) {
		this.dataSource.filter = filterValue.trim().toLowerCase();
	}
	public isAllSelected() {
		let numSelected = this.selection.selected.length;
		let numRows = this.dataSource.data.length;
		return numSelected === numRows;
	}
	public import() {
		let projects: string[] = new Array();
		this.selection.selected.forEach(p => {
			projects.push(p.group+";"+p.name+";"+p.repoURL);
		});

		this.dialog.open(StatusDialogComponent, {
			minWidth:'500px',
			data: {title:"Import Log", subject: "IMPORTMSG"},
		})
		this.api.StartImport(this.instanceURL, this.token, projects, this.username).subscribe(resp => {
			if (resp.errors == null) {
			}
		});
	}
}