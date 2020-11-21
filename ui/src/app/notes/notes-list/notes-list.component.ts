import { FormControl } from '@angular/forms';
import { MatDialog, MatSnackBar } from '@angular/material';
import { FocusMonitor } from "@angular/cdk/a11y";
import { Router, ActivatedRoute } from '@angular/router';
import { Component, OnInit, AfterViewInit, ChangeDetectorRef, NgZone, ViewChild, ElementRef, OnDestroy } from '@angular/core';

import { APIService } from 'app/services/api/api.service';
import { DataCacheService } from 'app/services/data-cache.service';
import { DocEditorComponent } from 'app/notes/doc-editor/doc-editor.component';
import { PageTag, Page, NotebookReference, NewPageResponse } from 'app/services/api/QueryResponses';
import { AreYouSureDialogComponent } from 'app/notes/notes-list/are-you-sure-dialog/are-you-sure-dialog.component';
import { NewNotebookDialogComponent } from './new-notebook-dialog/new-notebook-dialog.component';

@Component({
	selector: 'app-notes-list',
	templateUrl: './notes-list.component.html',
	styleUrls: ['./notes-list.component.css']
})
export class NotesListComponent implements OnInit, OnDestroy, AfterViewInit {
	@ViewChild('search') filterDropdown: ElementRef<HTMLElement>;

	public filterText: string = "";
	public activePageID: string = "";
	public activeNotebookID: string;
	public activeNotebokName: string;
	public haveFilter: boolean = false;
	public showSearch: boolean = false;
	public notes: Page[] = new Array<Page>();
	public showProjectListMenu: boolean = false;
	public docTags: PageTag[] = Array<PageTag>();
	public docTagsMap: Map<string, string> = new Map();
	public notebooks: NotebookReference[] = new Array<NotebookReference>();
	public filteredProjects: NotebookReference[] = new Array<NotebookReference>();
	public scrollbarOptions = {
		scrollInertia: 0,
		theme: 'dark',
		scrollbarPosition: "inside",
		alwaysShowScrollbar: 0,
		autoHideScrollbar: true,
	};
	public selectedTags: FormControl = new FormControl(new Set());
	public pageContent: string = "";

	constructor(private router: Router, private route: ActivatedRoute, private api: APIService, private focusMon: FocusMonitor,
		private cdr: ChangeDetectorRef, private zone: NgZone, private dialog: MatDialog, private cache: DataCacheService,
		private snackBar: MatSnackBar) { }

	ngOnInit() {
		this.route.params.subscribe((params) => {
			if (params.nbid != "all" && params.nbid != undefined) {
				this.activeNotebookID = params.nbid;
				this.cache.getPages(params.nbid, false).subscribe(resp => {
					this.notes = resp;
				});
			} else {
				this.notes = Array();
				this.activeNotebookID = "";
			}
			if (this.activeNotebookID !== "" && params.page !== undefined) {
				this.activePageID = params.page;
				this.api.GetPageContent(this.activePageID, this.activeNotebookID).subscribe(resp => {
					if (resp.status == "success") {
						this.pageContent = JSON.parse(resp.response);
					}
				})
			}
		});
		this.cache.getNotebookList(false).subscribe(resp => {
			this.notebooks = resp;
		})
		this.cache.getTagList().subscribe(resp => {
			this.docTags = resp;
			this.docTagsMap = this.cache.getTagMap();
		});
	}
	ngAfterViewInit() {
		if (this.filterDropdown) {
			this.focusMon.monitor(this.filterDropdown, true).subscribe(o => this.zone.run(() => {
				this.cdr.markForCheck();
				if (o == null) { this.showSearch = false; }
			}));
		}
	}
	ngOnDestroy(): void {
		if (this.filterDropdown) {
			this.focusMon.stopMonitoring(this.filterDropdown);
		}
	}
	public showMenu(which: string, event: MouseEvent) {
		if (which == "filter") {
			this.showSearch = !this.showSearch;
			this.showProjectListMenu = false;
		}
	}
	public notebookClicked(notebook: NotebookReference) {
		this.activePageID = "";
		this.cache.setCurrentNotebook(notebook);
		this.router.navigate(["nb", notebook.id]);
	}
	public noteClicked(id: string) {
		if (this.activePageID != "") {
			this.router.navigate(["../../page", id], { relativeTo: this.route });
		} else {
			this.router.navigate(["page", id], { relativeTo: this.route });
		}
	}
	public newDocument() {
		var newPage = this.dialog.open(DocEditorComponent, {
			width: '1050px', disableClose: true, autoFocus: true,
			data: { activeNotebook: this.activeNotebookID }
		});

		newPage.afterClosed().subscribe(result => {
			newPage.close();
			var res = <NewPageResponse>result;
			if (res.successful) {
				this.showMessage("Created new page: " + res.page.title);
				this.cache.currentPageList.push(res.page);
			} else if (res.error != "closed") {
				this.showMessage("Failed: " + res.error)
			}
		})
	}
	//thanks andrewseguin for this stackblitz thing: https://stackblitz.com/edit/mat-chip-selected-with-set-bug-lmuuab
	public clicked(id: number) {
		const addChip = () => { this.selectedTags.value.add(id); };
		const removeChip = () => { this.selectedTags.value.delete(id); };
		this.selectedTags.value.has(id) ? removeChip() : addChip();
		var tagsSelected: Array<number> = Array.from(this.selectedTags.value);
	}
	public addNotebook() {
		var notebookName = this.dialog.open(NewNotebookDialogComponent, { width: '500px', disableClose: true, autoFocus: true, data: {} });
		notebookName.afterClosed().subscribe(newName => {
			if (newName != "") {
				this.api.NewNotebook(newName).subscribe(resp => {
					if (resp.status == "success") {
						this.showMessage("Enjoy your shiny new notebook!");
						this.cache.getNotebookList(true).subscribe(resp => {
							this.notebooks = resp;
						});
					}
				}, error => { this.showMessage("Failed: " + error); })
			}
		})
	}
	public deletePage(pageID: string, pageTitle: string) {
		var areYouSure = this.dialog.open(AreYouSureDialogComponent, {
			width: '500px',
			disableClose: true,
			data: { name: pageTitle, deleteType: "page" }
		});
		areYouSure.afterClosed().subscribe(result => {
			if (result) {
				this.api.DeletePage(pageID, this.activeNotebookID).subscribe(resp => {
					if (resp.status == "success") {
						this.showMessage("Successfully deleted: " + pageTitle);
						this.cache.getPages(this.activeNotebookID, true).subscribe(resp => { this.notes = resp; });
						this.activePageID = "";
						this.pageContent = "";
						this.router.navigate(["nb", this.activeNotebookID]);
					}
				}, error => { this.showMessage("Failed: " + error); })
			}
		})
	}
	public deleteNotebook() {
		var notebookName: string
		this.notebooks.forEach((notebookRef) => {
			if (notebookRef.id == this.activeNotebookID) {
				notebookName = notebookRef.name;
				return;
			}
		})
		if (notebookName == null) {
			this.showMessage("Hmm...");
		} else {
			var areYouSure = this.dialog.open(AreYouSureDialogComponent, {
				width: '500px',
				disableClose: true,
				data: { name: notebookName, deleteType: "notebook" }
			});
			areYouSure.afterClosed().subscribe(result => {
				if (result) {
					this.api.DeleteNotebook(this.activeNotebookID).subscribe(resp => {
						if (resp.status) {
							this.activeNotebookID = "";
							this.showMessage(notebookName + " burnt to a crisp!");
							this.cache.getNotebookList(true).subscribe(resp => { });
							this.router.navigate(["nb"]);
						}
					})
				}
			}, error => { this.showMessage("Failed: " + error); });
		}
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

	public getInitials(projectName: string) {
		return projectName.substring(0, 2);
	}
	private showMessage(message: string) {
		this.snackBar.open(message, "", {
			duration: 3000,
			horizontalPosition: "right",
			verticalPosition: "top"
		})
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
