import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material';

import { APIService } from 'app/services/api/api.service';
import { ProjectGroup, Project, GQLResult, UpdateProjectResponse } from 'app/services/api/QueryResponses';
import { environment } from 'environments/environment';

@Component({
	selector: 'app-admin-edit-project',
	templateUrl: './admin-edit-project.html',
	styleUrls: ['./admin-edit-project.css']
})
export class AdminEditProjectComponent implements OnInit {
	public projects: Project[];
	public project: string = "";
	public projectGroup: string = "";
	public newGroupName: string = "";
	public groupList: ProjectGroup[];
	public isProd: boolean = environment.production

	private oldGroupName: string = "";
	private oldProjectName: string = "";

	public scrollbarOptions = {
		scrollInertia: 0,
		theme: 'dark',
		scrollbarPosition: "inside",
		alwaysShowScrollbar: 0,
		autoHideScrollbar: true,
	};

	constructor(public api: APIService, private snackBar: MatSnackBar) {
		this.api.GetProjectsList(0).subscribe(p => this.projects = p.data.projects);
		this.api.GetProjectGroups(true).subscribe(groups => this.groupList = groups.data.groups);
	}
	ngOnInit() {
	}
	public projectListClick(project: string, group: string) {
		this.project = project;
		this.projectGroup = group;
		this.oldGroupName = group;
		this.oldProjectName = project;
	}
	public save() {
		let newValue: string = "";
		let changeType: string = "";

		if (this.newGroupName != "") {
			this.api.NewProjectGroup(this.newGroupName).subscribe(resp => this.showSaveResp(resp));
		}
		if (this.project != this.oldProjectName) {
			changeType = "name";
			newValue = this.project;
		} else if (this.projectGroup != this.oldGroupName) {
			changeType = "group";
			if (this.projectGroup == "new") {
				newValue = this.newGroupName;
			} else {
				newValue = this.projectGroup;
			}
		}
		//TODO: Feature flag edits
		this.api.UpdateProject(this.oldProjectName, changeType, newValue).subscribe(resp => this.showSaveResp(resp));
	}
	public disableSaveButton(): boolean {
		if (this.projectGroup == "new" && this.newGroupName == "") { return true; }
		else if (this.projectGroup == "") { return true; }
		else if (this.project == "") { return true; }
		else { return false; }
	}
	private showSaveResp<T>(resp: GQLResult<T>) {

		if (resp.errors != null) {
			this.snackBar.open(resp.errors[0].message, "", {
				duration: 3000, horizontalPosition: "right",
				verticalPosition: "top"
			});
		} else {
			this.snackBar.open("Success!", "", {
				duration: 3000, horizontalPosition: "right",
				verticalPosition: "top"
			});
		}
	}
}
