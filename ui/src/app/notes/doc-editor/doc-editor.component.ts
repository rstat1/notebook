///<reference path="medium-editor.d.ts" />"
import * as MediumEditor from 'medium-editor';

import { Observable } from 'rxjs';
import { FormControl } from '@angular/forms';
import { map, startWith } from 'rxjs/operators';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatAutocompleteSelectedEvent, MatChipInputEvent, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { Component, ElementRef, ViewChild, ComponentFactoryResolver, Injector, Type, AfterViewInit, Inject, OnInit } from '@angular/core';

import { APIService } from 'app/services/api/api.service';
import { DataCacheService } from 'app/services/data-cache.service';
import { NewPageMetadata, NewPageRequest, NewPageResponse, Page, PageTag } from 'app/services/api/QueryResponses';

import { MDBoldButton, MDCodeButton, MDItalicButton, MDStrikeButton } from 'app/notes/doc-editor/markdown-buttons'

export type BlockComponent<T> = Type<T>;

@Component({
	selector: 'app-doc-editor',
	templateUrl: './doc-editor.html',
	styleUrls: ['./doc-editor.css'],
})
export class DocEditorComponent implements AfterViewInit, OnInit {
	public text: string = "";
	public title: string = "";
	public saveSuccess: boolean;
	public activePageID: string;
	public activeNotebookID: string;
	public currentDate = new Date();
	public editMode: boolean = false;
	public removable: boolean = true;
	public selectable: boolean = true;
	public tags: PageTag[] = new Array();
	public tagsAsStr: string[] = new Array();
	public filteredTags: Observable<string[]>;
	public selectedTags: PageTag[] = new Array();
	public docTagsMap: Map<string, string> = new Map();
	public separatorKeysCodes: number[] = [ENTER, COMMA];
	public tagFormControl: FormControl = new FormControl();

	public originalTitle: string = "";
	public originalContent: string = "";
	public originalTags: PageTag[] = Array();

	public mdEditor: MediumEditor.MediumEditor;
	@ViewChild('tagInput', { static: true }) public tagInput: ElementRef;
	@ViewChild('editorBlock', { static: true }) public editor: ElementRef;
	@ViewChild('titleEdit', { static: true }) public titleElement: ElementRef;
	public scrollbarOptions = { scrollInertia: 0, theme: 'dark', scrollbarPosition: "inside", alwaysShowScrollbar: 0, autoHideScrollbar: true };

	constructor(@Inject(MAT_DIALOG_DATA) public data: any, private resolve: ComponentFactoryResolver, private inject: Injector,
		private cache: DataCacheService, public dialogRef: MatDialogRef<DocEditorComponent>, private api: APIService) {

		this.filteredTags = this.tagFormControl.valueChanges.pipe(
			startWith(null),
			map((fruit: string | null) => fruit ? this.filter(fruit) : this.tagsAsStr.slice()));
	}

	ngOnInit(): void {
		this.cache.getTagList().subscribe(resp => {
			resp.forEach((tag) => {
				this.tagsAsStr.push(tag.tagValue);
			})
			this.tags = resp;
		})
	}
	ngAfterViewInit(): void {
		this.editMode = <boolean>this.data.edit;
		this.activeNotebookID = <string>this.data.activeNotebook;
		this.mdEditor = new MediumEditor(this.editor.nativeElement, {
			toolbar: {
				buttons: ["md-bold", "md-italic", "md-strike", "md-code"]
			},
			paste: {
				forcePlainText: true,
				cleanPastedHTML: true,
				cleanAttrs: ['class', 'style', 'dir', 'name'],
			},
			placeholder: {
				hideOnClick: false,
				text: "Page content goes here"
			},
			extensions: {
				'MDCode': new MDCodeButton(),
				'MDBold': new MDBoldButton(),
				'MDStrike': new MDStrikeButton(),
				'MDItalic': new MDItalicButton(),
			}
		});
		if (this.editMode) {
			this.editor.nativeElement.innerText = this.originalContent = <string>this.data.pageContent;
			this.activePageID = <string>this.data.activePage;

			this.docTagsMap = this.cache.getTagMap()
			this.cache.getPages(this.activeNotebookID, false).subscribe(resp => {
				resp.forEach((page) => {
					if (page.id == this.activePageID) {
						this.titleElement.nativeElement.innerText = this.originalTitle = page.title;
						page.tags.forEach((tag) => {
							this.addTag(this.docTagsMap.get(<string>(<unknown>tag)));
						})
						this.originalTags = this.selectedTags;
					}
				})
			});
		}
	}
	add(event: MatChipInputEvent) {
		const input = event.input;
		const value = event.value;

		if ((value || '').trim()) {
			this.addTag(value.trim());
		}
		if (input) {
			input.value = "";
		}
		this.tagFormControl.setValue(null);
	}
	remove(tag: PageTag) {
		const index = this.selectedTags.indexOf(tag);

		if (index >= 0) {
			this.selectedTags.splice(index, 1);
		}
	}
	selected(event: MatAutocompleteSelectedEvent) {
		this.tagFormControl.setValue(null);
		this.addTag(event.option.viewValue);
		this.tagInput.nativeElement.value = "";
	}
	titleInput() {
		this.title = this.titleElement.nativeElement.innerText;
	}
	keyDown(event: KeyboardEvent) {
		return true;
	}
	addTag(tagValue: string) {
		tagValue = tagValue.replace('"', "")
		var tag: PageTag = this.tags.find(tag => tag.tagValue == tagValue)
		if (!this.selectedTags.includes(tag) && (this.selectedTags.length + 1) < 4) {
			this.selectedTags.push(tag);
		}
	}
	public removeHTML(event: ClipboardEvent) {
		var editor = this.editor.nativeElement;
		var es = document.getElementById("editor-stage");
		var pastedText = event.clipboardData.getData("text/html");
		if (pastedText != "") {
			event.preventDefault();
			es.innerHTML = pastedText;
			setTimeout(() => {
				this.text = this.getText(es);
				editor.innerText = this.text;
				es.innerHTML = null;
			}, 1);
		}
	}
	public close() {
		this.dialogRef.close(new NewPageResponse("closed", null, "closed"));
	}
	public save() {
		if (this.editMode == false) {
			this.saveNewPage();
		} else {
			this.saveEditedPage();
		}
	}
	private saveNewPage() {
		let newPage: NewPageRequest;
		let newPageForm: FormData = new FormData();
		let pageMD: NewPageMetadata = new NewPageMetadata();

		pageMD.title = this.title;
		pageMD.tags = new Array<string>();
		this.selectedTags.forEach((value: PageTag) => {
			pageMD.tags.push(value.tagId);
		});

		newPage = new NewPageRequest(pageMD, this.activeNotebookID);

		newPageForm.append("metadata", JSON.stringify(newPage))
		newPageForm.append("content", this.getText(this.editor.nativeElement));

		this.api.NewPage(newPageForm).subscribe(resp => {
			if (resp.status == "success") {
				this.saveSuccess = true;
				this.dialogRef.close(new NewPageResponse(resp.status, JSON.parse(resp.response)));
			}
		}, error => {
			this.dialogRef.close(new NewPageResponse("failed", null, error.error.response));
		})
	}
	private saveEditedPage() {
		let newPage: NewPageRequest;
		let newPageForm: FormData = new FormData();
		let pageMD: NewPageMetadata = new NewPageMetadata();
		let noteContent: string = this.getText(this.editor.nativeElement);
		pageMD.id = this.activePageID;
		pageMD.tags = new Array<string>();
		pageMD.title = this.titleElement.nativeElement.innerText;
		this.selectedTags.forEach((value: PageTag) => {
			pageMD.tags.push(value.tagId);
		});

		newPage = new NewPageRequest(pageMD, this.activeNotebookID);
		newPageForm.append("metadata", JSON.stringify(newPage))

		if (noteContent != this.originalContent) {
			newPageForm.append("content", noteContent);
		}

		if (this.originalTitle != this.title || this.originalTags != this.selectedTags) {
			this.api.EditPage(newPageForm).subscribe(resp => {
				if (resp.status == "success") {
					this.saveSuccess = true;
					if (noteContent != this.originalContent) {
						this.dialogRef.close("md|content");
					} else {
						this.dialogRef.close("md");
					}
				}
			}, error => {
				this.dialogRef.close(new NewPageResponse("failed", null, error.error.response));
			})
		} else {
			this.saveSuccess = true;
			this.dialogRef.close(new NewPageResponse("Nothing changed", null));
		}
	}
	private getStyle(n: any, p: any): any {
		return n.currentStyle ?
			n.currentStyle[p] :
			document.defaultView.getComputedStyle(n, null).getPropertyValue(p);
	}
	private getText(node: any): string {
		var result = '';
		if (node == null) {
			node = document.getElementById("editor-stage");
		}
		if (node.nodeType == document.TEXT_NODE) {
			result = node.nodeValue;
		} else {
			for (var i = 0; i < node.childNodes.length; i++) {
				result += this.getText(node.childNodes[i]);
			}

			var d = this.getStyle(node, 'display');
			if (d.match(/^block/) || d.match(/list/) || d.match(/row/) || node.tagName == 'BR' || node.tagName == 'HR') {
				result += '\n';
			}
		}

		return result;
	}
	private filter(value: string): string[] {
		const filterValue = value.toLowerCase();
		return this.tagsAsStr.filter(fruit => fruit.toLowerCase().indexOf(filterValue) === 0);
	}
}
