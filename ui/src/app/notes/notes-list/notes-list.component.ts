import { FocusMonitor } from "@angular/cdk/a11y";
import { Router, ActivatedRoute } from '@angular/router';
import { FormControl } from '@angular/forms';
import { Component, OnInit, AfterViewInit, ChangeDetectorRef, NgZone, ViewChild, ElementRef, OnDestroy } from '@angular/core';

import { Task, DocumentTag, DCDocument } from 'app/services/api/QueryResponses';
import { APIService } from 'app/services/api/api.service';
import { MatDialog } from '@angular/material';
import { DocEditorComponent } from '../doc-editor/doc-editor.component';
import { DataCacheService } from 'app/services/data-cache.service';

@Component({
	selector: 'app-notes-list',
	templateUrl: './notes-list.component.html',
	styleUrls: ['./notes-list.component.css']
})
export class NotesListComponent implements OnInit, OnDestroy, AfterViewInit {
	@ViewChild('projects', { static: false }) projectsDropdown: ElementRef<HTMLElement>;
	@ViewChild('search', { static: false }) filterDropdown: ElementRef<HTMLElement>;

	public pageTitle: string;
	public filterText: string = "";
	public haveFilter: boolean = false;
	public showSearch: boolean = false;
	public showProjectListMenu: boolean = false;
	public notes: DCDocument[] = new Array<DCDocument>();
	public projects: string[] = new Array<string>();
	public docTags: DocumentTag[] = Array<DocumentTag>();
	public docTagsMap: Map<number, string> = new Map();
	public recentProjects: string[] = new Array<string>();
	public filteredProjects: string[] = new Array<string>();
	public scrollbarOptions = {
		scrollInertia: 0,
		theme: 'dark',
		scrollbarPosition: "inside",
		alwaysShowScrollbar: 0,
		autoHideScrollbar: true,
	};
	public selectedTags: FormControl = new FormControl(new Set());

	constructor(private router: Router, private route: ActivatedRoute, private api: APIService, private focusMon: FocusMonitor,
		private cdr: ChangeDetectorRef, private zone: NgZone, private dialog: MatDialog, private cache: DataCacheService) { }

	ngOnInit() {
		this.filteredProjects = this.recentProjects;
		this.route.params.subscribe((params) => { this.pageTitle = params.name + " Notes"; });
		this.api.GetProjectsList(0).subscribe(resp => {
			resp.data.projects.forEach(p => {
				this.projects.push(p.projectName);
			});
		});
		this.api.GetRecentProjects().subscribe(resp => {
			resp.data.recent.forEach(p => {
				this.recentProjects.push(p.projectName);
			});
		});
		// this.api.GetTags().subscribe(resp => {
		// 	resp.data.alltags.forEach(p => {
		// 		this.docTagsMap.set(p.tagId, p.tagValue);
		// 		this.docTags.push(p);
		// 	});
		// });
		this.cache.getTagList().subscribe(resp => {
			this.docTags = resp;
			this.docTagsMap = this.cache.getTagMap();
		});
		this.api.GetDocRefsWithTags([]).subscribe(resp => {
			this.notes = resp.data.documents;
		});
	}
	ngAfterViewInit() {
		this.focusMon.monitor(this.projectsDropdown, true).subscribe(o => this.zone.run(() => {
			this.cdr.markForCheck();
			if (o == null) { this.showProjectListMenu = false; }
			// else {
			// 	this.projectsDropdown.nativeElement.focus();
			// }
		}));
		this.focusMon.monitor(this.filterDropdown, true).subscribe(o => this.zone.run(() => {
			this.cdr.markForCheck();
			if (o == null) { this.showSearch = false; }
		}));
	}
	ngOnDestroy(): void {
		this.focusMon.stopMonitoring(this.projectsDropdown);
		this.focusMon.stopMonitoring(this.filterDropdown);
	}
	//thanks andrewseguin for this stackblitz thing: https://stackblitz.com/edit/mat-chip-selected-with-set-bug-lmuuab
	public clicked(id: number) {
		const addChip = () => { this.selectedTags.value.add(id); };
		const removeChip = () => { this.selectedTags.value.delete(id); };
		this.selectedTags.value.has(id) ? removeChip() : addChip();
		var tagsSelected: Array<number> = Array.from(this.selectedTags.value);
		if (tagsSelected.length > 0) {
			this.pageTitle = "Custom Filter";
		} else {
			this.pageTitle = "All Notes";
		}
		this.api.GetDocRefsWithTags(tagsSelected).subscribe(resp => {
			this.notes = resp.data.documents;
		});
	}
	public filterProjects() {
		if (this.filterText != "") {
			this.haveFilter = true;
			this.filteredProjects = this.projects.filter(name => name.indexOf(this.filterText, 0) > -1, this);
		} else {
			this.haveFilter = false;
			this.filteredProjects = this.recentProjects;
		}
	}
	public showMenu(which: string, event: MouseEvent) {
		if (which == "projects") {
			this.showProjectListMenu = !this.showProjectListMenu;
			this.showSearch = false;
			if (this.showProjectListMenu) {
				this.projectsDropdown.nativeElement.focus();
			}
		}
		else if (which == "filter") {
			this.showSearch = !this.showSearch;
			this.showProjectListMenu = false;
		}
	}
	public projectClicked(name: string) {
		this.showProjectListMenu = false;
	}
	public getInitials(projectName: string) {
		return projectName.substring(0, 2);
	}
	public newDocument() {
		this.dialog.open(DocEditorComponent, {
			width: '1000px',
			disableClose: true,
			autoFocus: true,
			data: {},
		});
	}
	private handleProjectListUnfocus(e: FocusEvent) {
		let container = document.getElementById("projects-list-dropdown");
		let scrollbox = document.getElementById("scrollbox");
		const relatedTarget = e.relatedTarget as HTMLElement;

		console.log(relatedTarget);

		if (relatedTarget == undefined || (relatedTarget.parentElement != scrollbox && relatedTarget.parentElement != container)) {
			console.log(container);
			this.showProjectListMenu = false;
			container.style.display = "none";
		}
	}
}
