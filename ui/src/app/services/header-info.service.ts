import { Subject ,  Observable } from 'rxjs';
import { Injectable } from '@angular/core';

@Injectable()
export class HeaderInfoService {
	public CurrentPath: Observable<string>;
	public RightPagePath: Observable<string>;
	public RightPageTitle: Observable<string>;
	public CurrentPageTitle: Observable<string>;

	private currentPath: Subject<string>;
	private rightPagePath: Subject<string>;
	private rightPageTitle: Subject<string>;
	private currentPageSubject: Subject<string>;

	constructor() {
		this.currentPath = new Subject<string>();
		this.rightPagePath = new Subject<string>();
		this.rightPageTitle = new Subject<string>();
		this.currentPageSubject = new Subject<string>();

		this.CurrentPath = this.currentPath.asObservable();
		this.RightPagePath = this.currentPath.asObservable();
		this.RightPageTitle = this.currentPageSubject.asObservable();
		this.CurrentPageTitle = this.currentPageSubject.asObservable();
	}
	public SetRightPageTitle(newTitle: string) { this.rightPageTitle.next(newTitle); }
	public SetRightPagePath(newPath: string) { this.rightPagePath.next(newPath); }

	public SetCurrentPagePath(newPath: string) { this.currentPath.next(newPath); }
	public SetCurrentPageTitle(newTitle: string) { this.currentPageSubject.next(newTitle); }
}
