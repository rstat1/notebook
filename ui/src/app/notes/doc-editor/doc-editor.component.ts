import { UUID } from 'angular2-uuid';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, OnInit, ElementRef, ViewChild, ComponentFactoryResolver, Injector, ComponentRef, Type } from '@angular/core';

import { DocumentTag } from 'app/services/api/QueryResponses';
import { DataCacheService } from 'app/services/data-cache.service';
import { ICommandListEntry } from 'app/components/command-list/cmd-list-common';
import { ListOverlayService } from 'app/notes/list-overlay/list-overlay.service';
import { BlocksListComponent } from 'app/notes/blocks-list/blocks-list.component';
import { ListOverlayComponent } from 'app/notes/list-overlay/list-overlay.component';
import { BlockListItemComponent } from 'app/notes/block-list-item/block-list-item.component';
import { MarkdownBlockComponent } from 'app/notes/doc-editor/blocks/markdown-block/markdown-block.component';
import { IEditorBlock, IEditorBlockHost, IEditorBlockAction } from 'app/notes/doc-editor/blocks/block-common';
import { PlaceholderBlockComponent } from 'app/notes/doc-editor/blocks/placeholder-block/placeholder-block.component';

export type BlockComponent<T> = Type<T>;

@Component({
	selector: 'app-doc-editor',
	templateUrl: './doc-editor.html',
	styleUrls: ['./doc-editor.css'],
})
export class DocEditorComponent implements OnInit, IEditorBlockHost {
	public text: string = "";
	public title: string = "";
	public currentDate = new Date();
	public showTagsPH: boolean = true;
	public showTitlePH: boolean = true;
	public tags: DocumentTag[] = new Array();
	@ViewChild('editorBlock', { static: true }) public editor: ElementRef;
	public scrollbarOptions = { scrollInertia: 0, theme: 'dark', scrollbarPosition: "inside", alwaysShowScrollbar: 0, autoHideScrollbar: true };

	private cmdStop: number = -1;
	private lastCmd: string = "";
	private cmdStart: number = -1;
	private overlayVisible: boolean = false;
	private lastCmdComplete: boolean = false;

	constructor(private resolve: ComponentFactoryResolver, private inject: Injector, private listOverlay: ListOverlayService, private cache: DataCacheService) { }

	ngOnInit() { }
	addEditorBlockAction(action: IEditorBlockAction): void {
		throw new Error("Method not implemented.");
	}
	deleteABlock(blockID: string): void {
		throw new Error("Method not implemented.");
	}
	showListOfBlocks(blockID: string): void {
		this.showListOverlay(this.editor.nativeElement);
	}
	keyDown(event: KeyboardEvent) {
		if (event != undefined) {
			var currentText: string = this.editor.nativeElement.innerText;
			if (event.key == "Enter" && this.isCommand() && this.lastCmdComplete) {
				if (this.overlayVisible == true) {
					this.listOverlay.close();
					this.overlayVisible = false;
				}
				this.editor.nativeElement.innerText = currentText.replace(this.lastCmd, "");
				event.preventDefault();

				console.log(this.lastCmd)

				if (this.lastCmd.startsWith("tag")) {
					this.showTagsPH = false;
					this.addTag(this.lastCmd.substring(4).replace('"', ""));
				} else if (this.lastCmd.startsWith("block")) {
					console.log("add block")

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
			var tag: DocumentTag = resp.find(tag => tag.tagValue == tagValue)
			if (!this.tags.includes(tag)) {
				this.tags.push(tag);
			}
		});
	}
	onInput() {
		var currentText: string = this.editor.nativeElement.innerText;

		if (currentText.charAt(0) == "/" && currentText.length == 1) {
			if (this.overlayVisible == false) {
				this.showListOverlay();
				this.overlayVisible = true;
			}
		} else if (currentText.length == 0) {
			this.listOverlay.close();
			this.overlayVisible = false;
		} else if (this.isCommand()) {

		}
		if (this.overlayVisible) {
			this.listOverlay.filterList(currentText);
		}
	}
	isCommand(): boolean {
		var firstQuote: number = -1;
		var secondQuote: number = -1;
		var currentText: string = this.editor.nativeElement.innerText;
		var tagIdx: number = currentText.indexOf('tag:"');
		var titleIdx: number = currentText.indexOf("title:");
		var blockIdx: number = currentText.indexOf('block:"');

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
		if (blockIdx > -1) {
			this.cmdStart = blockIdx;
			firstQuote = currentText.indexOf('"', blockIdx);
			if (firstQuote > -1) {
				secondQuote = currentText.indexOf('"', firstQuote + 1);
				if (secondQuote > -1) {
					this.lastCmd = 'block:"' + currentText.substring(firstQuote + 1, secondQuote) + '"';
					this.cmdStop = secondQuote;
					this.lastCmdComplete = true;
				} else {
					if (this.lastCmd == "") {
						this.lastCmd = 'block:"';
						this.lastCmdComplete = false;
					}
					this.cmdStop = firstQuote;
				}
			}
			if (!this.overlayVisible) {
				this.showListOverlay();
			}
		}
		if (this.lastCmd != "") { return true }
		else { return false; }
	}
	itemSelected(item: ICommandListEntry) {
		switch (item.description) {
			case "markdown":
				this.lastCmd += 'markdown"';
				this.lastCmdComplete = true;
				this.editor.nativeElement.innerText = (<string>this.editor.nativeElement.innerText).slice(0, this.cmdStop) + '"markdown"' +
					(<string>this.editor.nativeElement.innerText).slice(this.cmdStop + 10);
				break;
		}
		this.listOverlay.close();
		this.overlayVisible = false;
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
			resp.forEach((value, idx) => {
				blocks.push({
					context: value,
					description: value.tagValue,
					action: (extra: ICommandListEntry) => this.tagListItemClicked(extra),
					itemTemplate: this.createBlockListItem("list", value.tagValue, "")
				});
			});
		});

		return blocks;
	}
	getCommandList(): ICommandListEntry[] {
		var blocks: ICommandListEntry[] = new Array();

		blocks.push({
			description: "markdown",
			action: (extra: ICommandListEntry) => this.itemSelected(extra),
			itemTemplate: this.createBlockListItem("font_download", "Markdown", "Add a block of text. Markdown is supported here.")
		});
		blocks.push({
			description: "list",
			action: (extra: ICommandListEntry) => this.itemSelected(extra),
			itemTemplate: this.createBlockListItem("list", "List", "Add a list block")
		});
		blocks.push({
			description: "picture",
			action: (extra: ICommandListEntry) => this.itemSelected(extra),
			itemTemplate: this.createBlockListItem("wallpaper", "Picture", "Upload/embed an image")
		});
		blocks.push({
			description: "code",
			action: (extra: ICommandListEntry) => this.itemSelected(extra),
			itemTemplate: this.createBlockListItem("code", "Code Snippet", "Capture a code snippet")
		});
		return blocks;
	}
	filterCommandList(filter: string): ICommandListEntry[] {
		throw new Error("Method not implemented.");
	}
	trackByBlock(index: number, item: any) {
		return item;
	}
	public addBlock() {
		this.showListOverlay();
	}
	private showListOverlay(origin?: HTMLElement, listItems?: ICommandListEntry[]) {
		var items: ICommandListEntry[] = this.getCommandList();
		if (!origin) {
			origin = this.editor.nativeElement;
		}
		if (listItems != undefined && listItems.length > 0) {
			items = listItems;
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
	private createBlock<T>(block: BlockComponent<T>): ComponentRef<T> {
		let partFactory = this.resolve.resolveComponentFactory(block);
		let blockInstance = partFactory.create(this.inject);
		return blockInstance;
	}
	private createMarkdownBlock() {

	}
}
