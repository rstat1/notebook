import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material';
import { FocusMonitor } from "@angular/cdk/a11y";
import { Router, ActivatedRoute } from '@angular/router';
import { Component, OnInit, AfterViewInit, ChangeDetectorRef, NgZone, ViewChild, ElementRef, OnDestroy } from '@angular/core';

import { APIService } from 'app/services/api/api.service';
import { DataCacheService } from 'app/services/data-cache.service';
import { DocEditorComponent } from 'app/notes/doc-editor/doc-editor.component';
import { PageTag, Page, NotebookReference, PageReference } from 'app/services/api/QueryResponses';

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
	public notes: PageReference[] = new Array<PageReference>();
	public projects: NotebookReference[] = new Array<NotebookReference>();
	public docTags: PageTag[] = Array<PageTag>();
	public docTagsMap: Map<string, string> = new Map();
	public filteredProjects: NotebookReference[] = new Array<NotebookReference>();
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
		this.route.params.subscribe((params) => { this.pageTitle = params.name + " Notes"; });
		this.api.GetNotebookRefs().subscribe(resp => {
			this.filteredProjects = this.projects = JSON.parse(resp.response);
		});
		this.cache.getTagList().subscribe(resp => {
			this.docTags = resp;
			this.docTagsMap = this.cache.getTagMap();
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
	}
	public getTagValue(value: string): string {
		return this.docTagsMap.get(value);
	}
	public filterProjects() {
		if (this.filterText != "") {
			this.haveFilter = true;
			this.filteredProjects = this.projects.filter(notebook => notebook.name.indexOf(this.filterText, 0) > -1, this);
		} else {
			this.haveFilter = false;
			this.filteredProjects = this.projects;
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
	public projectClicked(notebook: NotebookReference) {
		this.showProjectListMenu = false;
		this.pageTitle = notebook.name;
		this.api.GetPages(notebook.id).subscribe(resp => {
			this.notes = JSON.parse(resp.response);
		});
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
