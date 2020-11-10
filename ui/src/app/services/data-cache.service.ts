import { Injectable } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';

import { APIService } from 'app/services/api/api.service';
import { NotebookReference, PageReference, PageTag } from 'app/services/api/QueryResponses';

@Injectable({ providedIn: 'root' })
export class DataCacheService {
	public tagMap: Map<string, string>;
	public tags: PageTag[] = Array<PageTag>();
	private currentNotebook: NotebookReference;
	private tagsListSubject: ReplaySubject<PageTag[]>;
	private notebooksSubject: ReplaySubject<NotebookReference[]>;
	private notebooks: NotebookReference[] = Array<NotebookReference>();

	constructor(private api: APIService) {
		this.tags = new Array<PageTag>();
		this.tagMap = new Map<string, string>();
		this.notebooks = new Array<NotebookReference>();

		this.tagsListSubject = new ReplaySubject<PageTag[]>(1);
		this.notebooksSubject = new ReplaySubject<NotebookReference[]>(1);
	}
	public getTagList(): Observable<PageTag[]> {
		if (this.tags.length == 0) {
			this.api.GetTags().subscribe(resp => {
				this.tags = JSON.parse(resp.response);
				this.tags.forEach(p => {
					this.tagMap.set(p.tagId, p.tagValue);
				});
				this.tagsListSubject.next(this.tags);
			});
		}
		return this.tagsListSubject.asObservable();
	}
	public getNotebookList(): Observable<NotebookReference[]> {
		if (this.notebooks.length == 0) {
			this.api.GetNotebookRefs().subscribe(resp => {
				if (resp.status == "success") {
					this.notebooks = JSON.parse(resp.response);
					this.notebooksSubject.next(this.notebooks);
				}
			})
		} else {
			this.notebooksSubject.next(this.notebooks);
		}
		return this.notebooksSubject.asObservable();
	}
	public getTagMap(): Map<string, string> {
		return this.tagMap;
	}
	public getCurrentNotebook(): NotebookReference { return this.currentNotebook; }
	public setCurrentNotebook(notebook: NotebookReference) {
		this.currentNotebook = notebook;
	}
}
