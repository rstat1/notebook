import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, AbstractControl, FormControl,
		 ValidationErrors, Validators } from '@angular/forms';

import { environment } from 'environments/environment';
import { MenuService } from 'app/services/menu.service';
import { EventService } from 'app/services/event.service';
import { Project, ProjectGroup } from 'app/services/api/QueryResponses';
import { APIService, NewProject } from 'app/services/api/api.service';

@Component({
	selector: 'admin-new-project',
	templateUrl: './new-project.html',
	styleUrls: ['./new-project.css']
})
export class AdminNewProjectComponent implements OnInit {
	public projectGroup: string = "";
	public groupList: ProjectGroup[];
	public groupNameGroup: FormGroup;
	public projectSettings: FormGroup;
	public projectNameGroup: FormGroup;
	public m: NewProject = new NewProject();
	public isProd: boolean = environment.production

	private static projectsList: Project[];

	constructor(private formBuilder: FormBuilder, private api: APIService, private menu: MenuService,
				private events: EventService, private router: Router, private route: ActivatedRoute) {
		this.api.GetProjectGroups(true).subscribe(groups => this.groupList = groups.data.groups);
		this.api.GetProjectsList(0).subscribe(projects => AdminNewProjectComponent.projectsList = projects.data.projects);
	}
	ngOnInit() {
		this.projectNameGroup = this.formBuilder.group({
			'projectName': new FormControl('', [
				this.ValidateProjectName,
			]),
		});
		this.projectSettings = this.formBuilder.group({
			'createProjectGroup': new FormControl(false, []),
			'allowBuildConfig': new FormControl(false, []),
		});
		this.groupNameGroup = this.formBuilder.group({
			'groupName': new FormControl('', [Validators.required])
		});
		this.menu.SetMenuContext("projects", "");
	}
	public ValidateProjectName(control: AbstractControl):  ValidationErrors | null {
		let foundAProject: boolean = false;
		if (control.value != "" && control.value != undefined) {
			AdminNewProjectComponent.projectsList.filter((value,idx,projects) => {
				if (value.projectName == control.value) {
					foundAProject = true;
				}
			})
		}
		if (foundAProject) { return { projectAlreadyExists: true }}
		else { return null; }
	}
	public disableSaveButton(): boolean {
		if ( (<any>this.groupNameGroup.value).groupName == "") { return true; }
		else if ((<any>this.projectNameGroup.value).projectName == "") { return true; }
		else { return false; }
	}
	public save() {
		this.m.Group =  (<any>this.groupNameGroup.value).groupName;
		this.m.AllowsBuildConfig = (<any>this.projectSettings.value).allowBuildConfig;
		this.m.Name = (<any>this.projectNameGroup.value).projectName;
		this.api.NewProject(this.m).subscribe(resp => {
			if (resp.errors == null) {
				this.router.navigate(["projects", {outlets: {right: null}}]);
				this.events.TriggerEvent("updateProjectList");
			}
		});
	}
}