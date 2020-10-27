export class Project {
	group: string;
	projectName: string;
	latestCommit: Commit;
}
export class Commit {
	author: string;
	branch: string;
	hash: string;
	message: string;
	time: string;
}
export class Task {
	public taskID: number;
	public taskTitle: string;
	public taskDescription: string;
	public version: string;
	public completed: boolean;
	public canceled: boolean;
	public subTasks: string[];
	public lastStateChange: string;
}
export class SubTask {
	public taskTitle: string;
	public canceled: boolean;
	public completed: boolean;
	public parentTaskTitle: string;
	public taskDescription: string;
	public lastStateChange: string;
	constructor(private parent: string, private title: string, private description: string) {
		this.taskTitle = title;
		this.taskDescription = description;
		this.parentTaskTitle = parent;
		this.canceled = false;
		this.completed = false;
		this.lastStateChange = "";
	}
}
export class File {
	public name: string;
	public path: string;
	public size: number;
	public type: string;
	public content: string;
}
export class SystemStats {
	public tasksCount: number;
	public subTasksCount: number;
	public groupCount: number;
	public projectCount: number;
	public backupStatus: string;
	public diskSpace: number;
	public commits: number;
	// public notes: number;
}
export class NewTaskDialogResponse {
	public task: Task;
	public subTasks: SubTask[];
}
export class NewTaskEventArgs {
	public title: string;
	public parent: string;
	public editorID: string;
	public description: string;
}
export class BackupActionDetails {
	public type: string;
	public group: string;
	public name: string;
}
export class NewAPIToken {
	public token: string;
}
export class NewProject {
	public projectName: string;
}
export class APIToken {
	public name: string;
	public scopes: string;
	public creationDate: string;
}
export class DeleteToken {
	public tokens: APIToken[];
}
export class GQLError {
	public message: string;
	public locations: GQLErrorLocation[];
}
export class GQLErrorLocation {
	public line: number;
	public column: number;
}
export class GQLResult<T> {
	public data: T;
	public errors: GQLError[];
}
export class AWSCreds {
	public secretKey: string;
	public accessKeyID: string;
}
export class B2Creds {
	public applicationKey: string;
	public applicationKeyID: string;
}
export class RestoreActionDetails {
	public action: string;
	public repos: string[];
	constructor(Action: string, Repos: string[]) {
		this.action = Action;
		this.repos = Repos;
	}
}
export class ProjectGroup {
	public name: string;
	public projects: string[];
}
export class GitlabProject {
	public group: string;
	public name: string;
	public repoURL: string;
}
export class GitLabInfo {
	public projects: GitlabProject[];
	public username: string;
}
export class ImportResult {
	public error: string;
	public result: string;
}
export class RecentProject {
	public group: string;
	public projectName: string;
	public lastCommitMessage: string;
}
export class Diff {
	public patchContent: string;
}
export class SubTaskCount {
	public count: string;
	public taskID: number;
}
export class TasksList {
	public subTaskCounts: SubTaskCount[];
	public taskList: Task[];
}
export class DCDocument {
	public id: number;
	public title: string;
	public layout: string;
	public tags: DocumentTag[];
}
export class DocumentTag {
	public tagId: number;
	public tagValue: string;
}
export class GetTagsResponse {
	alltags: DocumentTag[];
}
export class GetDocsWithTagResponse {
	documents: DCDocument[];
}
export class TaskStateChangedResponse {
	public activeCount: string;
	public newState: string;
}
export class SubTaskCreatedResponse {
	public details: Task;
	public activeCount: string;
}
export interface ProjectsQueryResponse {
	projects: Project[];
}
export interface ProjectQueryResponse {
	project: Project;
}
export interface TopCommitResponse {
	latestCommit: Commit;
}
export interface AllCommitsResponse {
	commits: Commit[];
}
export interface GetVersionsResponse {
	versions: string[];
}
export interface GetTasksResponse {
	tasks: TasksList;
}
export interface GetSubTasksResponse {
	subTasks: SubTask[];
}
export interface GetTaskStateResponse {
	lastStateChange: string;
}
export interface GetProjectFilesResponse {
	files: File[];
}
export interface GetProjectFileResponse {
	file: File;
}
export interface GetSystemStatsResponse {
	systemStats: SystemStats;
}
export interface GetRepoBackupListResponse {
	repoBackupList: string[];
}
export interface GetTokensResponse {
	tokens: APIToken[];
}
export interface DeleteSubTaskResponse {
	deleteSubTask: string;
}
export interface GetAWSCredsResposne {
	awsCredentials: AWSCreds;
}
export interface GetProjectGroupsResponse {
	groups: ProjectGroup[];
}
export interface GetRecentProjectsResponse {
	recent: RecentProject[];
}
export interface IsBackupConfiguredResponse {
	isBackupConfigured: boolean;
}
export interface ConnectToGitLabResponse {
	gitlabInfo: GitLabInfo;
}
export interface NewAPITokenResponse {
	newToken: NewAPIToken;
}
export interface NewProjectGroupResponse {
	newProejctGroup: string;
}
export interface DeleteTokenResponse {
	deleteToken: DeleteToken;
}
export interface DeleteProjectResponse {
	deleteProject: NewProject;
}
export interface UpdateB2CredsResponse {
	updateB2Credentials: boolean;
}
export interface UpdateAWSCredsResponse {
	updateAWSCredentials: AWSCreds;
}
export interface UpdateBackupListResponse {
	updateRepoBackupList: string;
}
export interface UpdateTaskStatusResponse {
	updateTaskStatus: TaskStateChangedResponse;
}
export interface UpdateProjectResponse {
	project: Project;
}
export interface DataImportResponse {
	newGitLabImport: ImportResult;
}
export interface CommitDiffResponse {
	diff: Diff;
}
export interface NewProjectResponse {
	newProject: NewProject;
}
export interface NewTaskResponse {
	newTask: Task;
}
export interface NewSubTaskResponse {
	newSubTask: SubTaskCreatedResponse;
}
export interface NewVersionResponse {
	newVersion: string;
}