import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material';
import { FocusMonitor } from "@angular/cdk/a11y";
import { Router, ActivatedRoute } from '@angular/router';
import { Component, OnInit, AfterViewInit, ChangeDetectorRef, NgZone, ViewChild, ElementRef, OnDestroy } from '@angular/core';

import { APIService } from 'app/services/api/api.service';
import { DataCacheService } from 'app/services/data-cache.service';
import { DocEditorComponent } from 'app/notes/doc-editor/doc-editor.component';
import { PageTag, Page, NotebookReference, PageReference } from 'app/services/api/QueryResponses';
import { NotebookListItemComponent } from 'app/components/notebook-list-item/notebook-list-item.component';

@Component({
	selector: 'app-notes-list',
	templateUrl: './notes-list.component.html',
	styleUrls: ['./notes-list.component.css']
})
export class NotesListComponent implements OnInit, OnDestroy, AfterViewInit {
	@ViewChild('projects') projectsDropdown: ElementRef<HTMLElement>;
	@ViewChild('search') filterDropdown: ElementRef<HTMLElement>;

	public activePageID: string = "";
	public filterText: string = "";
	public activeNotebookID: string;
	public haveFilter: boolean = false;
	public showSearch: boolean = false;
	public currentDate = new Date();
	public showProjectListMenu: boolean = false;
	public notes: PageReference[] = new Array<PageReference>();
	public notebooks: NotebookReference[] = new Array<NotebookReference>();
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
	public activePage: PageReference = null;
	public pageContent: string = "";

	constructor(private router: Router, private route: ActivatedRoute, private api: APIService, private focusMon: FocusMonitor,
		private cdr: ChangeDetectorRef, private zone: NgZone, private dialog: MatDialog, private cache: DataCacheService) { }

	ngOnInit() {
		this.route.params.subscribe((params) => {
			console.log(params)
			if (params.nbid != "all" && params.nbid != undefined) {
				this.activeNotebookID = params.nbid;
				this.api.GetPages(params.nbid).subscribe(resp => {
					this.notes = JSON.parse(resp.response);
				});
			} else {
				this.notes = Array();
				this.activeNotebookID = "";
			}

			if (this.activeNotebookID != "" && params.page != "") {
				console.log("load page: " + params.page + " from notebook: " + params.nbid)
				this.activePageID = params.page;
				this.api.GetPageMetadata(this.activePageID, this.activeNotebookID).subscribe(resp => {
					if (resp.status == "success") {
						this.activePage = JSON.parse(resp.response);
						this.api.GetPageContent(this.activePageID, this.activeNotebookID).subscribe(resp => {
							if (resp.status == "success") {
								this.pageContent = JSON.parse(resp.response);
							}
						})
					}
				});
			}
		});
		this.cache.getNotebookList().subscribe(resp => {
			this.notebooks = resp;
		})
		this.cache.getTagList().subscribe(resp => {
			this.docTags = resp;
			this.docTagsMap = this.cache.getTagMap();
		});
	}
	ngAfterViewInit() {
		this.focusMon.monitor(this.projectsDropdown, true).subscribe(o => this.zone.run(() => {
			this.cdr.markForCheck();
			if (o == null) { this.showProjectListMenu = false; }
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
	}
	public isActiveNB(id: string): boolean {
		return id === this.activeNotebookID;
	}
	public isActiveNote(id: string): boolean {
		return id === this.activePageID;
	}
	public getTagValue(value: string): string {
		return this.docTagsMap.get(value);
	}
	public filterProjects() {
		if (this.filterText != "") {
			this.haveFilter = true;
			this.filteredProjects = this.notebooks.filter(notebook => notebook.name.indexOf(this.filterText, 0) > -1, this);
		} else {
			this.haveFilter = false;
			this.filteredProjects = this.notebooks;
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
	public notebookClicked(notebook: NotebookReference) {
		this.activePageID = "";
		this.router.navigate(["nb/" + notebook.id]);
	}
	public noteClicked(id: string) {
		this.router.navigate(["page", id], { relativeTo: this.route });
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
