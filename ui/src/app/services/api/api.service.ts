import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';
import { ConfigService } from "app/services/config.service";
import { GraphQLService, GraphQLObject, GQLObservable, GQLSubject } from 'app/services/graphql.service';
import {
	ProjectsQueryResponse, TopCommitResponse, Task, AllCommitsResponse, GetVersionsResponse,
	GetTasksResponse, GetSubTasksResponse, SubTask, GetTagsResponse, GetProjectFilesResponse,
	GetProjectFileResponse, GetSystemStatsResponse, APIToken, NewAPITokenResponse, GetTokensResponse, DeleteSubTaskResponse,
	DeleteTokenResponse, NewProjectResponse, DeleteProjectResponse, UpdateBackupListResponse, GetRecentProjectsResponse,
	GetRepoBackupListResponse, IsBackupConfiguredResponse, RestoreActionDetails, CommitDiffResponse,
	UpdateTaskStatusResponse, UpdateProjectResponse, NewProjectGroupResponse, ConnectToGitLabResponse,
	DataImportResponse, NewTaskResponse, NewVersionResponse, NewSubTaskResponse, GetProjectGroupsResponse, GetDocsWithTagResponse
} from 'app/services/api/QueryResponses';

export class AuthRequest {
	public Username: string;
	public Password: string;
	constructor(username: string, password: string) {
		this.Username = username;
		this.Password = password;
	}
}
export interface APIResponse {
	status: string;
	response: string;
}
export class NewProject {
	public Name: string;
	public Group: string;
	public AllowsBuildConfig: boolean;
}

@Injectable()
export class APIService {
	constructor(private http: HttpClient, private gql: GraphQLService) { }
	public GetLog(): Observable<APIResponse> {
		return this.http.get<APIResponse>(ConfigService.GetAPIURLFor("backuplog"));
	}
	public TriggerBackup(details: string): Observable<APIResponse> {
		return this.http.post<APIResponse>(ConfigService.GetAPIURLFor("recovery"), details);
	}
	public DataRestore(action: string, repos: string[]): Observable<APIResponse> {
		let details = JSON.stringify(new RestoreActionDetails(action, repos));
		return this.http.post<APIResponse>(ConfigService.GetAPIURLFor("restore"), details);
	}
	public ValidateToken(): Observable<APIResponse> {
		return this.http.get<APIResponse>(ConfigService.GetTokenValidateURL());
	}
	public GetAuthToken(code: string): Observable<APIResponse> {
		return this.http.get<APIResponse>(ConfigService.GetAPIURLFor("auth/token?code=" + code));
	}
	public GetWSAuthTicket(): Observable<APIResponse> {
		return this.http.post<APIResponse>(ConfigService.GetTrinityURLFor("ws/ticket"), "");
	}
	public StartImport(instanceURL: string, accessToken: string, projects: string[], user: string): GQLObservable<DataImportResponse> {
		var args: Map<string, any> = new Map<string, any>();
		var importResp: GQLSubject<DataImportResponse> = new GQLSubject();
		var fields: GraphQLObject[] = [
			{ objectName: "error" },
			{ objectName: "result" },
		];
		args.set("gitlabUsername", '"' + user + '"');
		args.set("gitlabInstanceURL", '"' + instanceURL + '"');
		args.set("gitlabAccessToken", '"' + accessToken + '"');
		args.set("projectsToImport", JSON.stringify(projects));

		this.gql.MutationWithReturn<DataImportResponse>("newGitLabImport", args, fields, "")
			.subscribe(resp => { importResp.next(resp); });

		return importResp;
	}
	public GetProjectsList(limit: number = 0): GQLObservable<ProjectsQueryResponse> {
		var projects: GQLSubject<ProjectsQueryResponse> = new GQLSubject<ProjectsQueryResponse>();
		var args: Map<string, any> = new Map<string, any>();
		var fields: GraphQLObject[] = [
			{ objectName: "group" },
			{ objectName: "projectName" },
			{ objectName: "latestCommit", fields: ["author", "hash", "branch", "message", "time"] }
		];

		args.set("last", limit);

		this.gql.Query<ProjectsQueryResponse>("projects", args, fields, "projects")
			.subscribe(data => { projects.next(data); });

		return projects.asObservable();
	}
	public GetTopCommit(project: string): GQLObservable<TopCommitResponse> {
		var commit: GQLSubject<TopCommitResponse> = new GQLSubject<TopCommitResponse>();
		var args: Map<string, any> = new Map<string, any>();
		var fields: GraphQLObject[] = [];

		args["projectName"] = project;

		this.gql.Query<TopCommitResponse>("project", args, fields, "project")
			.subscribe(data => { commit.next(data); });

		return commit.asObservable();
	}
	public GetAllCommits(project: string, branch: string, limit: number = 0): GQLObservable<AllCommitsResponse> {
		var commits: GQLSubject<AllCommitsResponse> = new GQLSubject<AllCommitsResponse>();
		var args: Map<string, any> = new Map<string, any>();
		var fields: GraphQLObject[] = [
			{ objectName: "message" },
			{ objectName: "author" },
			{ objectName: "time" },
			{ objectName: "hash" },
		];

		args.set("limit", limit);
		args.set("project", '"' + project + '"');
		args.set("branch", '"' + branch + '"');

		this.gql.Query<AllCommitsResponse>("commits", args, fields, "commits+" + project)
			.subscribe(data => { commits.next(data); });

		return commits.asObservable();
	}
	public GetTasks(project: string, version: string): GQLObservable<GetTasksResponse> {
		var fields: GraphQLObject[] = [];
		var args: Map<string, any> = new Map<string, any>();
		var getTasksResp: GQLSubject<GetTasksResponse> = new GQLSubject<GetTasksResponse>();
		var fields: GraphQLObject[] = [
			{
				objectName: "taskList", fields: [
					"taskTitle",
					"taskDescription",
					"completed",
					"canceled",
					"version",
					"lastStateChange",
					"taskID"
				]
			},
			{ objectName: "subTaskCounts", fields: ["count", "taskID"] }
		];

		args.set("project", '"' + project + '"');
		args.set("version", '"' + version + '"');

		this.gql.Query<GetTasksResponse>("tasks", args, fields, "tasks+" + project)
			.subscribe(data => { getTasksResp.next(data); });

		return getTasksResp.asObservable();
	}
	public GetSubTasks(project: string, parent: string): GQLObservable<GetSubTasksResponse> {
		var fields: GraphQLObject[] = [];
		var args: Map<string, any> = new Map<string, any>();
		var getTasksResp: GQLSubject<GetSubTasksResponse> = new GQLSubject<GetSubTasksResponse>();
		var fields: GraphQLObject[] = [
			{ objectName: "taskTitle" },
			{ objectName: "taskDescription" },
			{ objectName: "completed" },
			{ objectName: "canceled" },
			{ objectName: "lastStateChange" },
		];
		args.set("project", '"' + project + '"');
		args.set("parentTaskTitle", '"' + parent + '"');

		this.gql.Query<GetSubTasksResponse>("subTasks", args, fields, "subTasks+" + parent)
			.subscribe((data) => { getTasksResp.next(data); }, (error) => { getTasksResp.next(null); });

		return getTasksResp.asObservable();
	}
	public GetVersions(project: string): GQLObservable<GetVersionsResponse> {
		var args: Map<string, any> = new Map<string, any>();
		var getTasksResp: GQLSubject<GetVersionsResponse> = new GQLSubject<GetVersionsResponse>();
		var fields: GraphQLObject[] = [];

		args.set("project", '"' + project + '"');

		this.gql.Query<GetVersionsResponse>("versions", args, fields, "versions+" + project)
			.subscribe(data => { getTasksResp.next(data); });

		return getTasksResp.asObservable();
	}
	public GetProjectFiles(project: string, path: string, branch: string, rev: string): GQLObservable<GetProjectFilesResponse> {
		var args: Map<string, any> = new Map<string, any>();
		var getFilesResp: GQLSubject<GetProjectFilesResponse> = new GQLSubject<GetProjectFilesResponse>();
		var fields: GraphQLObject[] = [
			{ objectName: "type" },
			{ objectName: "path" },
			{ objectName: "name" },
		];

		args.set("rev", '"' + rev + '"');
		args.set("path", '"' + path + '"');
		args.set("branch", '"' + branch + '"');
		args.set("project", '"' + project + '"');

		//"files+"+project+"-"+path -> TODO: Project tree caching.
		this.gql.Query<GetProjectFilesResponse>("files", args, fields, "")
			.subscribe((data) => { getFilesResp.next(data); }, (error) => { getFilesResp.next(null); });

		return getFilesResp.asObservable();
	}
	public GetProjectFile(project: string, path: string, rev: string): GQLObservable<GetProjectFileResponse> {
		var args: Map<string, any> = new Map<string, any>();
		var getFilesResp: GQLSubject<GetProjectFileResponse> = new GQLSubject<GetProjectFileResponse>();
		var fields: GraphQLObject[] = [
			{ objectName: "content" },
		];

		args.set("name", '"' + path + '"');
		args.set("project", '"' + project + '"');
		args.set("rev", '"' + rev + '"');

		this.gql.Query<GetProjectFileResponse>("file", args, fields, "")
			.subscribe((data) => { getFilesResp.next(data); }, (error) => { getFilesResp.next(null); });

		return getFilesResp.asObservable();
	}
	public GetSystemStats(): GQLObservable<GetSystemStatsResponse> {
		var getStatsResp: GQLSubject<GetSystemStatsResponse> = new GQLSubject();
		var fields: GraphQLObject[] = [
			{ objectName: "backupStatus" },
			{ objectName: "groupCount" },
			{ objectName: "projectCount" },
			{ objectName: "tasksCount" },
			{ objectName: "subTasksCount" },
			{ objectName: "diskSpace" },
			{ objectName: "commits" },
			// {objectName: "notes"},
		];

		this.gql.Query<GetSystemStatsResponse>("systemStats", null, fields, "systemStats")
			.subscribe((data) => { getStatsResp.next(data); }, (_) => { getStatsResp.next(null); });

		return getStatsResp.asObservable();
	}
	public GetTokens(): GQLObservable<GetTokensResponse> {
		var getTokensResp: GQLSubject<GetTokensResponse> = new GQLSubject();
		var fields: GraphQLObject[] = [
			{ objectName: "name" },
			{ objectName: "scopes" },
			{ objectName: "createdAt" },
		];

		this.gql.Query<GetTokensResponse>("tokens", null, fields, "")
			.subscribe((data) => { getTokensResp.next(data); }, (_) => { getTokensResp.next(null); });

		return getTokensResp.asObservable();
	}
	public GetRepoBackupList(): GQLObservable<GetRepoBackupListResponse> {
		var getBackupListResp: GQLSubject<GetRepoBackupListResponse> = new GQLSubject();
		var fields: GraphQLObject[] = [];

		this.gql.Query<GetRepoBackupListResponse>("repoBackupList", null, fields, "")
			.subscribe((data) => { getBackupListResp.next(data); }, (_) => { getBackupListResp.next(null); });

		return getBackupListResp.asObservable();
	}
	public GetProjectGroups(namesOnly: boolean): GQLObservable<GetProjectGroupsResponse> {
		var getGroupsResp: GQLSubject<GetProjectGroupsResponse> = new GQLSubject();
		var fields: GraphQLObject[] = [
			{ objectName: "name" },
		];

		if (!namesOnly) {
			fields.push({ objectName: "projects" });
		}

		this.gql.Query<GetProjectGroupsResponse>("groups", null, fields, "projects")
			.subscribe((data) => { getGroupsResp.next(data); }, (_) => { getGroupsResp.next(null); });

		return getGroupsResp.asObservable();
	}
	public GetRecentProjects(): GQLObservable<GetRecentProjectsResponse> {
		var getRecentsResp: GQLSubject<GetRecentProjectsResponse> = new GQLSubject();
		var fields: GraphQLObject[] = [
			{ objectName: "group" },
			{ objectName: "projectName" },
			{ objectName: "lastCommitMessage" },
		];

		this.gql.Query<GetRecentProjectsResponse>("recent", null, fields, "recent")
			.subscribe((data) => { getRecentsResp.next(data); }, (_) => { getRecentsResp.next(null); });

		return getRecentsResp.asObservable();
	}
	public GetCommitDiff(projectName: string, baseHash: string): GQLObservable<CommitDiffResponse> {
		var args: Map<string, any> = new Map<string, any>();
		var getDiffResp: GQLSubject<CommitDiffResponse> = new GQLSubject();
		var fields: GraphQLObject[] = [
			{ objectName: "patchContent" }
		];
		args.set("projectName", '"' + projectName + '"');
		args.set("startHash", '"' + baseHash + '"');

		this.gql.Query<CommitDiffResponse>("diff", args, fields, "")
			.subscribe((data) => { getDiffResp.next(data); }, (_) => { getDiffResp.next(null); });

		return getDiffResp.asObservable();
	}
	public GetDocRefsWithTags(tags: number[]): GQLObservable<GetDocsWithTagResponse> {
		var args: Map<string, any> = new Map<string, any>();
		var getDocsWithTagsResp: GQLSubject<GetDocsWithTagResponse> = new GQLSubject();
		var fields: GraphQLObject[] = [
			{ objectName: "id" },
			{ objectName: "title" },
			{ objectName: "tags", fields: ["tagValue"] },
		];
		args.set("tags", tags);
		this.gql.Query<GetDocsWithTagResponse>("documents", args, fields, "")
			.subscribe((data) => { getDocsWithTagsResp.next(data); }, (_) => { getDocsWithTagsResp.next(null); });

		return getDocsWithTagsResp.asObservable();
	}
	public GetTags(): GQLObservable<GetTagsResponse> {
		var getTagsResp: GQLSubject<GetTagsResponse> = new GQLSubject();
		var fields: GraphQLObject[] = [
			{ objectName: "tagId" },
			{ objectName: "tagValue" },
		];

		this.gql.Query<GetTagsResponse>("alltags", null, fields, "tags")
			.subscribe((data) => { getTagsResp.next(data); }, (_) => { getTagsResp.next(null); });

		return getTagsResp.asObservable();
	}
	public ConnectToGitLab(instanceURL: string, accessToken: string): GQLObservable<ConnectToGitLabResponse> {
		var args: Map<string, any> = new Map<string, any>();
		var connectToGitLabResp: GQLSubject<ConnectToGitLabResponse> = new GQLSubject();
		var fields: GraphQLObject[] = [
			{ objectName: "username" },
			{ objectName: "projects", fields: ["name", "group", "repoURL"] },
		];

		args.set("gitlabInstanceURL", '"' + instanceURL + '"');
		args.set("gitlabAccessToken", '"' + accessToken + '"');

		this.gql.Query<ConnectToGitLabResponse>("gitlabInfo", args, fields, "")
			.subscribe((data) => { connectToGitLabResp.next(data); }, (_) => { connectToGitLabResp.next(null); });

		return connectToGitLabResp.asObservable();
	}
	public IsBackupConfigured(): GQLObservable<IsBackupConfiguredResponse> {
		var isBackupConfigResp: GQLSubject<IsBackupConfiguredResponse> = new GQLSubject();
		var fields: GraphQLObject[] = [];

		this.gql.Query<IsBackupConfiguredResponse>("isBackupConfigured", null, fields, "")
			.subscribe((data) => { isBackupConfigResp.next(data); }, (_) => { isBackupConfigResp.next(null); });

		return isBackupConfigResp.asObservable();
	}
	public NewProject(details: NewProject): GQLObservable<NewProjectResponse> {
		var args: Map<string, any> = new Map<string, any>();
		var newProjectResp: GQLSubject<NewProjectResponse> = new GQLSubject();
		var fields: GraphQLObject[] = [
			{ objectName: "projectName" },
		];

		args.set("projectName", '"' + details.Name + '"');
		args.set("groupName", '"' + details.Group + '"');

		this.gql.MutationWithReturn<NewProjectResponse>("newProject", args, fields, "projects")
			.subscribe(resp => { newProjectResp.next(resp); });
		return newProjectResp.asObservable();
	}
	public NewTask(task: Task, project: string): GQLObservable<NewTaskResponse> {
		var args: Map<string, any> = new Map<string, any>();
		var newTaskResp: GQLSubject<NewTaskResponse> = new GQLSubject();
		var fields: GraphQLObject[] = [
			{ objectName: "taskTitle" },
			{ objectName: "taskDescription" },
			{ objectName: "completed" },
			{ objectName: "canceled" },
		];

		args.set("project", '"' + project + '"');
		args.set("taskTitle", '"' + task.taskTitle + '"');
		args.set("taskDescription", '"' + task.taskDescription + '"');
		args.set("version", '"' + task.version + '"');

		this.gql.MutationWithReturn<NewTaskResponse>("newTask", args, fields, "tasks+" + project)
			.subscribe(resp => { newTaskResp.next(resp); });

		return newTaskResp.asObservable();
	}
	public NewVersion(version: string, project: string): GQLObservable<NewVersionResponse> {
		var args: Map<string, any> = new Map<string, any>();
		var newVersionResp: GQLSubject<NewVersionResponse> = new GQLSubject();
		var fields: GraphQLObject[] = [];

		args.set("project", '"' + project + '"');
		args.set("version", '"' + version + '"');

		this.gql.MutationWithReturn<NewVersionResponse>("newVersion", args, fields, "versions+" + project)
			.subscribe(resp => { newVersionResp.next(resp); });

		return newVersionResp.asObservable();
	}
	public NewSubTask(task: SubTask, project: string, version: string): GQLObservable<NewSubTaskResponse> {
		var args: Map<string, any> = new Map<string, any>();
		var newSubTaskResp: GQLSubject<NewSubTaskResponse> = new GQLSubject();
		var fields: GraphQLObject[] = [
			{
				objectName: "details", fields: [
					"taskTitle",
					"taskDescription",
					"completed",
					"version",
				]
			},
			{ objectName: "activeCount" }
		];

		args.set("project", '"' + project + '"');
		args.set("version", '"' + version + '"');
		args.set("parentTaskTitle", '"' + task.parentTaskTitle + '"');
		args.set("taskTitle", '"' + task.taskTitle + '"');
		args.set("taskDescription", '"' + task.taskDescription + '"');

		this.gql.MutationWithReturn<NewSubTaskResponse>("newSubTask", args, fields, "subTasks+" + task.parentTaskTitle)
			.subscribe(resp => { newSubTaskResp.next(resp); });

		return newSubTaskResp.asObservable();
	}
	public NewAPIToken(token: APIToken): GQLObservable<NewAPITokenResponse> {
		var args: Map<string, any> = new Map<string, any>();
		var newAPITokenResp: GQLSubject<NewAPITokenResponse> = new GQLSubject();
		var fields: GraphQLObject[] = [
			{ objectName: "token" },
		];
		args.set("tokenName", '"' + token.name + '"');
		args.set("scopes", '"' + token.scopes + '"');

		this.gql.MutationWithReturn<NewAPITokenResponse>("newToken", args, fields, "")
			.subscribe((resp) => { newAPITokenResp.next(resp); });

		return newAPITokenResp.asObservable();
	}
	public NewProjectGroup(groupName: string): GQLObservable<NewProjectGroupResponse> {
		var fields: GraphQLObject[] = [];
		var args: Map<string, any> = new Map<string, any>();
		var newGroupResp: GQLSubject<NewProjectGroupResponse> = new GQLSubject();

		args.set("name", '"' + groupName + '"');
		args.set("withSharedFeatures", true);

		this.gql.MutationWithReturn<NewProjectGroupResponse>("newProjectGroup", args, fields, "projects")
			.subscribe((resp) => { newGroupResp.next(resp); });

		return newGroupResp.asObservable();
	}
	public UpdateTaskStatus(project: string, taskTitle: string, newStatus: string, isSubTask: boolean, parentTitle?: string): GQLObservable<UpdateTaskStatusResponse> {
		var operationName: string = "tasks+" + project;
		var args: Map<string, any> = new Map<string, any>();
		var updateTaskResp: GQLSubject<UpdateTaskStatusResponse> = new GQLSubject();
		var fields: GraphQLObject[] = [
			{ objectName: "newState" },
			{ objectName: "activeCount" }
		];

		args.set("project", '"' + project + '"');
		args.set("taskTitle", '"' + taskTitle + '"');
		args.set("isSubTask", isSubTask);
		args.set("newStatus", '"' + newStatus + '"');

		if (isSubTask) { operationName = "subTasks+" + parentTitle; }

		this.gql.MutationWithReturn<UpdateTaskStatusResponse>("updateTaskStatus", args, fields, operationName)
			.subscribe(resp => { updateTaskResp.next(resp); });

		return updateTaskResp.asObservable();
	}
	public UpdateBackupList(project: string): GQLObservable<UpdateBackupListResponse> {
		var args: Map<string, any> = new Map<string, any>();
		var updateBackupListResp: GQLSubject<UpdateBackupListResponse> = new GQLSubject();
		var fields: GraphQLObject[] = [];

		args.set("name", '"' + project + '"');

		this.gql.MutationWithReturn<UpdateBackupListResponse>("updateRepoBackupList", args, fields, "")
			.subscribe(resp => { updateBackupListResp.next(resp); }, error => { updateBackupListResp.next(error); });

		return updateBackupListResp.asObservable();
	}
	public UpdateProject(project: string, changeType: string, newValue: string): GQLObservable<UpdateProjectResponse> {
		var args: Map<string, any> = new Map<string, any>();
		var updateProjectResp: GQLSubject<UpdateProjectResponse> = new GQLSubject();
		var fields: GraphQLObject[] = [
			{ objectName: "group" },
			{ objectName: "projectName" },
			{ objectName: "latestCommit", fields: ["author", "hash", "branch", "message", "time"] }
		];

		args.set("projectName", '"' + project + '"');
		args.set("changeType", '"' + changeType + '"');
		args.set("newValue", '"' + newValue + '"');

		this.gql.MutationWithReturn<UpdateProjectResponse>("updateProject", args, fields, "project+" + project)
			.subscribe(resp => { updateProjectResp.next(resp); }, error => { updateProjectResp.next(error); });

		return updateProjectResp.asObservable();
	}
	public DeleteProject(project: string): GQLObservable<DeleteProjectResponse> {
		var args: Map<string, any> = new Map<string, any>();
		var deleteProjectResp: GQLSubject<DeleteProjectResponse> = new GQLSubject();
		var fields: GraphQLObject[] = [
			{ objectName: "projectName" },
		];

		args.set("projectName", '"' + project + '"');

		this.gql.MutationWithReturn<DeleteProjectResponse>("deleteProject", args, fields, "projects")
			.subscribe(resp => { deleteProjectResp.next(resp); }, error => { deleteProjectResp.next(error); });

		return deleteProjectResp.asObservable();
	}
	public DeleteAPIToken(tokenName: string): GQLObservable<DeleteTokenResponse> {
		var args: Map<string, any> = new Map<string, any>();
		var deleteTokenResp: GQLSubject<DeleteTokenResponse> = new GQLSubject();
		var fields: GraphQLObject[] = [
			{ objectName: "tokens", fields: ["createdAt", "name", "scopes"] },
		];

		args.set("tokenName", '"' + tokenName + '"');

		this.gql.MutationWithReturn<DeleteTokenResponse>("deleteToken", args, fields, "")
			.subscribe(resp => { deleteTokenResp.next(resp); });

		return deleteTokenResp.asObservable();
	}
	public DeleteSubTask(parentTask: string, subTaskTitle: string, project: string): GQLObservable<DeleteSubTaskResponse> {
		var args: Map<string, any> = new Map<string, any>();
		var deleteSubTask: GQLSubject<DeleteSubTaskResponse> = new GQLSubject();
		var fields: GraphQLObject[] = [];

		args.set("project", '"' + project + '"');
		args.set("taskTitle", '"' + parentTask + '"');
		args.set("subTaskTitle", '"' + subTaskTitle + '"');

		this.gql.MutationWithReturn<DeleteSubTaskResponse>("deleteSubTask", args, fields, "subTasks+" + parentTask)
			.subscribe(resp => { deleteSubTask.next(resp); });

		return deleteSubTask.asObservable();
	}
}