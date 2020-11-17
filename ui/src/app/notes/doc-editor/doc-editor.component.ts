///<reference path="medium-editor.d.ts" />"
import * as MediumEditor from 'medium-editor';

import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { Component, ElementRef, ViewChild, ComponentFactoryResolver, Injector, ComponentRef, Type, AfterViewInit, Inject } from '@angular/core';

import { APIService } from 'app/services/api/api.service';
import { DataCacheService } from 'app/services/data-cache.service';
import { ICommandListEntry } from 'app/components/command-list/cmd-list-common';
import { ListOverlayService } from 'app/notes/list-overlay/list-overlay.service';
import { BlocksListComponent } from 'app/notes/blocks-list/blocks-list.component';
import { NewPageMetadata, NewPageRequest, PageTag } from 'app/services/api/QueryResponses';
import { BlockListItemComponent } from 'app/notes/block-list-item/block-list-item.component';

import { MDBoldButton, MDItalicButton, MDStrikeButton } from 'app/notes/doc-editor/markdown-buttons'

export type BlockComponent<T> = Type<T>;

@Component({
	selector: 'app-doc-editor',
	templateUrl: './doc-editor.html',
	styleUrls: ['./doc-editor.css'],
})
export class DocEditorComponent implements AfterViewInit {
	public text: string = "";
	public title: string = "";
	public saveSuccess: boolean;
	public activeNotebookID: string;
	public currentDate = new Date();
	public showTagsPH: boolean = true;
	public showTitlePH: boolean = true;
	public showContentPH: boolean = true;
	public tags: PageTag[] = new Array();
	public mdEditor: MediumEditor.MediumEditor;
	@ViewChild('editorBlock', { static: true }) public editor: ElementRef;
	public scrollbarOptions = { scrollInertia: 0, theme: 'dark', scrollbarPosition: "inside", alwaysShowScrollbar: 0, autoHideScrollbar: true };

	private cmdStop: number = -1;
	private lastCmd: string = "";
	private cmdStart: number = -1;
	private overlayVisible: boolean = false;
	private lastCmdComplete: boolean = false;

	constructor(@Inject(MAT_DIALOG_DATA) public data: any, private resolve: ComponentFactoryResolver, private inject: Injector,
		private listOverlay: ListOverlayService, private cache: DataCacheService, public dialogRef: MatDialogRef<DocEditorComponent>,
		private api: APIService) { }

	ngAfterViewInit(): void {
		this.activeNotebookID = <string>this.data.activeNotebook;
		this.mdEditor = new MediumEditor(this.editor.nativeElement, {
			toolbar: {
				buttons: ["md-bold", "md-italic", "md-strike"]
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
				'MDBold': new MDBoldButton(),
				'MDStrike': new MDStrikeButton(),
				'MDItalic': new MDItalicButton(),
			}
		});
	}
	showListOfBlocks(blockID: string): void {
		this.showListOverlay(this.editor.nativeElement);
	}
	keyDown(event: KeyboardEvent) {
		if (event != undefined) {
			var currentText: string = this.editor.nativeElement.innerText;
			if (currentText != "") { this.showContentPH = false; }
			else { this.showContentPH = true; }
			if (event.key == "Enter" && this.execCommand() && this.lastCmdComplete) {
				if (this.overlayVisible == true) {
					this.listOverlay.close();
					this.overlayVisible = false;
				}
				this.editor.nativeElement.innerText = currentText.replace(this.lastCmd, "");
				event.preventDefault();


				if (this.lastCmd.startsWith("tag")) {
					this.showTagsPH = false;
					this.addTag(this.lastCmd.substring(4).replace('"', ""));
				} else if (this.lastCmd.startsWith("title")) {
					this.showTitlePH = false;
					this.title = this.lastCmd.substring(7).replace('"', "");
				}

				this.lastCmd = "";
				this.lastCmdComplete = false;
			}
		}
	}
	addTag(tagValue: string) {
		tagValue = tagValue.replace('"', "")
		this.cache.getTagList().subscribe(resp => {
			var tag: PageTag = resp.find(tag => tag.tagValue == tagValue)
			if (!this.tags.includes(tag)) {
				this.tags.push(tag);
			}
		});
	}
	onInput() {
		var currentText: string = this.editor.nativeElement.innerText;
		if (currentText.length < 4 && this.overlayVisible) {
			this.listOverlay.close();
			this.overlayVisible = false;
		} else {
			this.execCommand()
		}
		if (this.overlayVisible) {
			this.listOverlay.filterList(currentText);
		}
	}
	execCommand(): boolean {
		var firstQuote: number = -1;
		var secondQuote: number = -1;
		var currentText: string = this.editor.nativeElement.innerText;
		var tagIdx: number = currentText.indexOf('tag:"');
		var titleIdx: number = currentText.indexOf("title:");

		if (titleIdx > -1) {
			firstQuote = currentText.indexOf('"', titleIdx);
			if (firstQuote > -1) {
				secondQuote = currentText.indexOf('"', firstQuote + 1);
				if (secondQuote > -1) {
					this.lastCmd = 'title:"' + currentText.substring(firstQuote + 1, secondQuote) + '"';
					this.cmdStop = secondQuote;
					this.lastCmdComplete = true;
				} else {
					if (this.lastCmd == "") {
						this.lastCmd = 'title:"';
						this.lastCmdComplete = false;
					}
					this.cmdStop = firstQuote;
				}
			}
		}
		if (tagIdx > -1) {
			this.cmdStart = tagIdx;
			firstQuote = currentText.indexOf('"', tagIdx);
			if (firstQuote > -1) {
				secondQuote = currentText.indexOf('"', firstQuote + 1);
				if (secondQuote > -1) {
					this.lastCmd = 'tag:"' + currentText.substring(firstQuote + 1, secondQuote) + '"';
					this.cmdStop = secondQuote;
					this.lastCmdComplete = true;
				} else {
					if (this.lastCmd == "") {
						this.lastCmd = 'tag:"';
						this.lastCmdComplete = false;
					}
					this.cmdStop = firstQuote;
				}
			}
			if (!this.overlayVisible) {
				this.showListOverlay(this.editor.nativeElement, this.getTagList());
			}
			this.lastCmd = 'tag:"' + currentText.substring(firstQuote + 1, secondQuote) + '"';
		}
		if (this.lastCmd != "") { return true }
		else { return false; }
	}
	tagListItemClicked(item: ICommandListEntry) {
		console.log("add tag with ID " + item.context.tagId + " & value " + item.context.tagValue);

		this.lastCmd += item.context.tagValue + '"';
		this.lastCmdComplete = true;
		this.editor.nativeElement.innerText = (<string>this.editor.nativeElement.innerText).slice(0, this.cmdStop) + '"' + item.context.tagValue + '"' +
			(<string>this.editor.nativeElement.innerText).slice(this.cmdStop + 10);

		this.editor.nativeElement.focus();

		this.listOverlay.close();
		this.overlayVisible = false;
	}
	getTagList(): ICommandListEntry[] {
		var blocks: ICommandListEntry[] = new Array();

		this.cache.getTagList().subscribe(resp => {
			if (resp.length > 0) {
				resp.forEach((value, idx) => {
					blocks.push({
						context: value,
						description: value.tagValue,
						action: (extra: ICommandListEntry) => this.tagListItemClicked(extra),
						itemTemplate: this.createBlockListItem("list", value.tagValue, "")
					});
				});
			}
		});

		return blocks;
	}
	trackByBlock(index: number, item: any) {
		return item;
	}
	public close() {
		this.dialogRef.close();
	}
	public save() {
		let newPage: NewPageRequest;
		let newPageForm: FormData = new FormData();
		let pageMD: NewPageMetadata = new NewPageMetadata();

		pageMD.title = this.title;
		pageMD.tags = new Array<string>();
		this.tags.forEach((value: PageTag) => {
			pageMD.tags.push(value.tagId);
		});
		pageMD.lastEdited = Date.now();

		newPage = new NewPageRequest(pageMD, this.activeNotebookID);

		newPageForm.append("metadata", JSON.stringify(newPage))
		newPageForm.append("content", this.editor.nativeElement.innerText);

		this.api.NewPage(newPageForm).subscribe(resp => {
			if (resp.response == "success") {
				this.saveSuccess = true;
				this.dialogRef.close(true);
			}
		})
	}
	public addBlock() {
		this.showListOverlay();
	}
	private showListOverlay(origin?: HTMLElement, listItems?: ICommandListEntry[]) {
		var items: ICommandListEntry[] = listItems;
		if (!origin) {
			origin = this.editor.nativeElement;
		}
		if (listItems != undefined && listItems.length > 0) {
			items = listItems;
		} else {
			items.push({
				context: "no-tags",
				description: "No tags available",
				action: (extra: ICommandListEntry) => { },
				itemTemplate: this.createBlockListItem("list", "No tags available", "")
			});
		}
		this.overlayVisible = true;
		this.listOverlay.open({ listElement: BlocksListComponent, listContent: items, listOrigin: origin });
	}
	private createBlockListItem(iconName: string, itemTitle: string, itemDescription: string): ComponentRef<BlockListItemComponent> {
		let partFactory = this.resolve.resolveComponentFactory(BlockListItemComponent);
		let childComponent = partFactory.create(this.inject);
		childComponent.instance.Icon = iconName;
		childComponent.instance.ItemText = itemTitle;
		childComponent.instance.ItemDescription = itemDescription;
		return childComponent;
	}
}
