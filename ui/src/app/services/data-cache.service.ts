import { Injectable } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';

import { APIService } from 'app/services/api/api.service';
import { NotebookReference, Page, PageTag } from 'app/services/api/QueryResponses';

@Injectable({ providedIn: 'root' })
export class DataCacheService {
	public tagMap: Map<string, string>;
	public tags: PageTag[] = Array<PageTag>();
	public currentPageList: Page[] = Array<Page>();

	private currentNBID: string = "";
	private currentNotebook: NotebookReference;
	private curPageLstSubject: ReplaySubject<Page[]>;
	private tagsListSubject: ReplaySubject<PageTag[]>;
	private notebooksSubject: ReplaySubject<NotebookReference[]>;
	private notebooks: NotebookReference[] = Array<NotebookReference>();

	constructor(private api: APIService) {
		this.tags = new Array<PageTag>();
		this.tagMap = new Map<string, string>();
		this.currentPageList = new Array<Page>();
		this.notebooks = new Array<NotebookReference>();
		this.currentNotebook = new NotebookReference();

		this.curPageLstSubject = new ReplaySubject<Page[]>(1);
		this.tagsListSubject = new ReplaySubject<PageTag[]>(1);
		this.notebooksSubject = new ReplaySubject<NotebookReference[]>(1);
	}
	public getTagList(): Observable<PageTag[]> {
		if (this.tags.length == 0) {
			this.api.GetTags().subscribe(resp => {
				var tags = JSON.parse(resp.response);
				if (tags != undefined) {
					this.tags = tags;
					this.tags.forEach(p => {
						this.tagMap.set(p.tagId, p.tagValue);
					});
				}
				this.tagsListSubject.next(this.tags);
			});
		}
		return this.tagsListSubject.asObservable();
	}
	public getNotebookList(reset: boolean): Observable<NotebookReference[]> {
		if (reset) { this.notebooks = new Array<NotebookReference>(); }
		if (this.notebooks == undefined || this.notebooks.length == 0) {
			this.api.GetNotebookRefs().subscribe(resp => {
				if (resp.status == "success") {
					var notebooksList = JSON.parse(resp.response);
					if (notebooksList != undefined) {
						this.notebooks = notebooksList;
					}
					this.notebooksSubject.next(this.notebooks);
				}
			})
		} else {
			this.notebooksSubject.next(this.notebooks);
		}
		return this.notebooksSubject.asObservable();
	}
	public getPages(notebookID: string, reset: boolean): Observable<Page[]> {
		if (reset) { this.currentPageList = new Array<Page>(); }
		if (this.currentPageList.length == 0 || notebookID != this.currentNBID) {
			this.api.GetPages(notebookID).subscribe(resp => {
				if (resp.status == "success") {
					this.currentNBID = notebookID;
					this.currentPageList = JSON.parse(resp.response);
					this.curPageLstSubject.next(this.currentPageList);
				}
			})
		} else {
			this.curPageLstSubject.next(this.currentPageList);
		}
		return this.curPageLstSubject.asObservable();
	}
	public getTagMap(): Map<string, string> {
		return this.tagMap;
	}
	public getCurrentNotebook(): NotebookReference { return this.currentNotebook; }
	public setCurrentNotebook(notebook: NotebookReference) {
		Object.assign(this.currentNotebook, notebook);
	}
}
