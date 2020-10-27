import { Injectable } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';

import { APIService } from 'app/services/api/api.service';
import { Commit, ProjectGroup, DocumentTag } from 'app/services/api/QueryResponses';

@Injectable({ providedIn: 'root' })
export class DataCacheService {
	private MAX_COMMITS: number = 400;
	private groups: ProjectGroup[];
	private commits: Map<string, Commit[]>;
	private gotCommits: ReplaySubject<Commit[]>;
	public tagsMap: Map<number, string> = new Map();
	public tags: DocumentTag[] = Array<DocumentTag>();
	private tagsListSubject: ReplaySubject<DocumentTag[]>;
	private projectsListSubject: ReplaySubject<ProjectGroup[]>;

	constructor(private api: APIService) {
		this.gotCommits = new ReplaySubject<Commit[]>(1);
		this.tagsListSubject = new ReplaySubject<DocumentTag[]>(1);
		this.projectsListSubject = new ReplaySubject<ProjectGroup[]>(1);

		this.groups = new Array<ProjectGroup>();
		this.commits = new Map<string, Commit[]>();
	}
	public getCommitListFromServer(project: string, branch: string): Observable<Commit[]> {
		if (this.commits[project] == null) {
			this.api.GetAllCommits(project, branch, this.MAX_COMMITS).subscribe(resp => {
				if (resp.data.commits != null) {
					this.commits.set(project, resp.data.commits);
					this.gotCommits.next(resp.data.commits);
				} else {
					this.gotCommits.next(null);
				}
			});
		} else {
			this.gotCommits.next(this.commits.get(project));
		}
		return this.gotCommits.asObservable();
	}
	public getProjectGroups(): Observable<ProjectGroup[]> {
		if (this.groups.length == 0) {
			this.api.GetProjectGroups(false).subscribe(groupList => {
				if (groupList.data.groups != null) {
					this.groups = groupList.data.groups;
					this.projectsListSubject.next(this.groups);
				}
			});
		} else {
			this.projectsListSubject.next(this.groups);
		}
		return this.projectsListSubject.asObservable();
	}
	public getProjectCommitList(projectName: string): Commit[] {
		return this.commits.get(projectName);
	}
	public getTagList(): Observable<DocumentTag[]> {
		if (this.tags.length == 0) {
			this.api.GetTags().subscribe(resp => {
				resp.data.alltags.forEach(p => {
					this.tagsMap.set(p.tagId, p.tagValue);
					this.tags.push(p);
				});
				this.tagsListSubject.next(this.tags);
			});
		}
		// else {
		// 	this.tagsListSubject.next(this.tags);
		// }
		return this.tagsListSubject.asObservable();
	}
	public getTagMap(): Map<number, string> {
		return this.tagsMap;
	}
}
