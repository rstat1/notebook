import { Component, OnInit, ViewChild, TemplateRef, AfterViewInit } from '@angular/core';
import { IEditorBlock, IEditorBlockHost, IEditorBlockAction } from 'app/notes/doc-editor/blocks/block-common';

@Component({
	selector: 'app-markdown-block',
	templateUrl: './markdown-block.html',
	styleUrls: ['./markdown-block.css']
})
export class MarkdownBlockComponent implements AfterViewInit, IEditorBlock {
	public blockID: string;
	public tooltipText: string;
	public blockHostRef: IEditorBlockHost;
	private columnCount: number = 1;
	private actions: IEditorBlockAction[] = new Array();
	@ViewChild("actions", { static: true }) private actionsTemplate: TemplateRef<any>;

	constructor() { }
	ngAfterViewInit(): void {
		this.actions.push({
			actionTemplate: this.actionsTemplate,
			action: this.toggleBlockMode,
		});
	}
	serialize(): string {
		throw new Error("Method not implemented.");
	}
	requestedCols(): number { return this.columnCount; }
	getEditorBlockActions(): IEditorBlockAction[] {
		return this.actions;
	}
	public expand() {
		this.tooltipText = this.columnCount == 1 ? "Shrink to half row" : "Expand to full row";
		this.columnCount = this.columnCount == 1 ? 2 : 1;
	}
	public toggleBlockMode() {

	}
}
