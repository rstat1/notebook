import { FormControl } from '@angular/forms';
import { MatDialog, MatSnackBar } from '@angular/material';
import { FocusMonitor } from "@angular/cdk/a11y";
import { Router, ActivatedRoute } from '@angular/router';
import { Component, OnInit, AfterViewInit, ChangeDetectorRef, NgZone, ViewChild, ElementRef, OnDestroy } from '@angular/core';

import { APIService } from 'app/services/api/api.service';
import { DataCacheService } from 'app/services/data-cache.service';
import { DocEditorComponent } from 'app/notes/doc-editor/doc-editor.component';
import { SettingsPanelComponent } from 'app/notes/settings-panel/settings-panel.component';
import { PageTag, Page, NotebookReference, NewPageResponse } from 'app/services/api/QueryResponses';
import { AreYouSureDialogComponent } from 'app/notes/notes-list/are-you-sure-dialog/are-you-sure-dialog.component';
import { NamePromptDialogComponent } from 'app/notes/notes-list/new-notebook-dialog/new-notebook-dialog.component';
import { SharingLinkDialogComponent } from './sharing-link-dialog/sharing-link-dialog.component';

@Component({
	selector: 'app-notes-list',
	templateUrl: './notes-list.component.html',
	styleUrls: ['./notes-list.component.css']
})
export class NotesListComponent implements OnInit, OnDestroy, AfterViewInit {
	@ViewChild('search') filterDropdown: ElementRef<HTMLElement>;

	public filterSize: number = 0;
	public pageContent: string = "";
	public activeNotebookID: string;
	public activePageID: string = "";
	public showSearch: boolean = false;
	public notes: Page[] = new Array<Page>();
	public docTags: PageTag[] = Array<PageTag>();
	public docTagsMap: Map<string, string> = new Map();
	public selectedTags: FormControl = new FormControl(new Set());
	public notebooks: NotebookReference[] = new Array<NotebookReference>();
	public listEmptyMessage: string = "This notebook is ready and eager for you to write exciting new things in it.";
	public scrollbarOptions = { scrollInertia: 0, theme: 'dark', scrollbarPosition: "inside", alwaysShowScrollbar: 0, autoHideScrollbar: true };

	constructor(private router: Router, private route: ActivatedRoute, private api: APIService, private focusMon: FocusMonitor,
		private cdr: ChangeDetectorRef, private zone: NgZone, private dialog: MatDialog, private cache: DataCacheService,
		private snackBar: MatSnackBar) { }

	ngOnInit() {
		this.route.params.subscribe((params) => {
			if (params.nbid != "all" && params.nbid != undefined) {
				this.activeNotebookID = params.nbid;
				this.filterSize = this.cache.getCurrentFilter().length;
				if (this.filterSize == 0) {
					this.cache.getPages(params.nbid, false).subscribe(resp => {
						this.notes = resp;
					});
				} else {
					this.notes = this.cache.getFilteredPageList();
				}
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
			this.focusMon.monitor(this.filterDropdown, true).subscribe(o => {
				this.cdr.markForCheck();
				if (o == null) { this.showSearch = false; }
			});
		} else {
			console.log("no focus")
		}
	}
	ngOnDestroy(): void {
		if (this.filterDropdown) {
			this.focusMon.stopMonitoring(this.filterDropdown);
		}
	}
	public showSettingsPanel() {
		var newPage = this.dialog.open(SettingsPanelComponent, {
			width: '1225px',
			height: '925px',
			autoFocus: true,
			disableClose: true,
			data: { activeNotebook: this.activeNotebookID }
		});
	}
	public showMenu(which: string, event: MouseEvent) {
		this.showSearch = !this.showSearch;
	}
	public notebookClicked(notebook: NotebookReference) {
		this.activePageID = "";
		this.cache.cacheFilterSet(new Array());
		this.cache.cacheFilteredPageList(new Array());
		this.selectedTags = new FormControl(new Set());
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
			data: { activeNotebook: this.activeNotebookID, edit: false }
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
	public editDocument() {
		var editPage = this.dialog.open(DocEditorComponent, {
			width: '1050px', disableClose: true, autoFocus: true,
			data: { activeNotebook: this.activeNotebookID, activePage: this.activePageID, edit: true, pageContent: this.pageContent }
		});
		editPage.afterClosed().subscribe(result => {
			this.cache.getPages(this.activeNotebookID, true).subscribe(resp => { this.notes = resp; });
			if (result == "md|content") {
				this.api.GetPageContent(this.activePageID, this.activeNotebookID).subscribe(resp => {
					if (resp.status == "success") {
						this.pageContent = JSON.parse(resp.response);
					}
				})
			}
		})
	}
	//thanks andrewseguin for this stackblitz thing: https://stackblitz.com/edit/mat-chip-selected-with-set-bug-lmuuab
	public tagClicked(id: number) {
		var tags: string[] = new Array();
		const addChip = () => { this.selectedTags.value.add(id); };
		const removeChip = () => { this.selectedTags.value.delete(id); };
		this.selectedTags.value.has(id) ? removeChip() : addChip();
		this.filterSize = (<Set<string>>this.selectedTags.value).size;

		(<Set<string>>this.selectedTags.value).forEach((value) => {
			tags.push(value);
		});

		if (this.filterSize > 0) {
			this.api.FilterNotesByTags(tags, this.activeNotebookID).subscribe(resp => {
				if (resp.status == "success") {
					var result: Page[] = JSON.parse(resp.response);
					this.cache.cacheFilterSet(tags);
					this.cache.cacheFilteredPageList(this.notes);
					if (result == null) {
						this.notes = new Array();
						this.listEmptyMessage = "You've filtered out all the notes.";
					} else {
						this.notes = result;
						this.listEmptyMessage = "This notebook is ready and eager for you to write exciting new things in it.";
					}
				}
			});
		} else {
			this.cache.getPages(this.activeNotebookID, false).subscribe(resp => {
				this.notes = resp;
				this.cache.cacheFilteredPageList(new Array());
				this.cache.cacheFilterSet(new Array());
			})
		}
	}
	public addNotebook() {
		var notebookName = this.dialog.open(NamePromptDialogComponent, {
			width: '500px',
			disableClose: true,
			autoFocus: true,
			data: { dialogType: "notebook" }
		});
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
	public addTag() {
		var notebookName = this.dialog.open(NamePromptDialogComponent, {
			width: '500px',
			disableClose: true,
			autoFocus: true,
			data: { dialogType: "tag" }
		});
		notebookName.afterClosed().subscribe(newName => {
			if (newName != "") {
				this.api.NewTag(newName).subscribe(resp => {
					if (resp.status == "success") {
						if (this.cache.tags.length == 0) {
							this.showMessage("Your journey begins here, with your first successful tag creation.");
						} else if (this.cache.tags.length > 0 && this.cache.tags.length < 10) {
							this.showMessage("Your power grows, with each new tag you create!")
						} else {
							this.showMessage("Having created a multitude of different tags, you've risen through the ranks to that of Tag Master! Congratulations.")
						}
						this.cache.tags.push(JSON.parse(resp.response));
					}
				}, error => { this.showMessage("Add tag failed: " + error) });
			}
		});
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
				}, error => {
					this.showMessage(error.error.response);
				})
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
	public share(id: string, title: string) {
		this.api.NewSharedPage(id, this.activeNotebookID, title).subscribe(resp => {
			var sharingID = JSON.parse(resp.response);
			this.dialog.open(SharingLinkDialogComponent, { width: '500px', disableClose: false, data: { name: title, sharedPageURL: sharingID } });
		}, error => { this.showMessage("Failed: " + error.error); })
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
			container.style.display = "none";
		}
	}
}
