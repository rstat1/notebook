///<reference path="medium-editor.d.ts" />"
import * as MediumEditor from 'medium-editor';

import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatAutocompleteSelectedEvent, MatChipInputEvent, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { Component, ElementRef, ViewChild, ComponentFactoryResolver, Injector, ComponentRef, Type, AfterViewInit, Inject, OnInit } from '@angular/core';

import { APIService } from 'app/services/api/api.service';
import { DataCacheService } from 'app/services/data-cache.service';
import { NewPageMetadata, NewPageRequest, NewPageResponse, PageTag } from 'app/services/api/QueryResponses';

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
	public activeNotebookID: string;
	public currentDate = new Date();
	public removable: boolean = true;
	public selectable: boolean = true;
	public tags: PageTag[] = new Array();
	public tagsAsStr: string[] = new Array();
	public filteredTags: Observable<string[]>;
	public selectedTags: PageTag[] = new Array();
	public separatorKeysCodes: number[] = [ENTER, COMMA];
	public tagFormControl: FormControl = new FormControl();

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
			console.log(this.tagsAsStr)
		})
	}
	ngAfterViewInit(): void {
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
	titleInput() {/*  */
		this.title = this.titleElement.nativeElement.innerText;
	}
	keyDown(event: KeyboardEvent) {

		return true;
	}
	addTag(tagValue: string) {
		tagValue = tagValue.replace('"', "")
		var tag: PageTag = this.tags.find(tag => tag.tagValue == tagValue)
		if (!this.selectedTags.includes(tag)) {
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
		let newPage: NewPageRequest;
		let newPageForm: FormData = new FormData();
		let pageMD: NewPageMetadata = new NewPageMetadata();

		pageMD.title = this.title;
		pageMD.tags = new Array<string>();
		this.selectedTags.forEach((value: PageTag) => {
			pageMD.tags.push(value.tagId);
		});
		pageMD.lastEdited = Date.now();

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
