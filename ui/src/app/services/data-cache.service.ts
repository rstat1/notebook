import { Injectable } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';

import { APIService } from 'app/services/api/api.service';
import { PageTag } from 'app/services/api/QueryResponses';

@Injectable({ providedIn: 'root' })
export class DataCacheService {

	public tagMap: Map<string, string>;
	public tags: PageTag[] = Array<PageTag>();
	private tagsListSubject: ReplaySubject<PageTag[]>;

	constructor(private api: APIService) {
		this.tagsListSubject = new ReplaySubject<PageTag[]>(1);
		this.tags = new Array<PageTag>();
		this.tagMap = new Map<string, string>();
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
	public getTagMap(): Map<string, string> {
		return this.tagMap;
	}
}
