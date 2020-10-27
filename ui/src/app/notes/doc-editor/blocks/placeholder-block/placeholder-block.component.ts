import { Component, OnInit, OnDestroy } from '@angular/core';
import { IEditorBlock, IEditorBlockHost, IEditorBlockAction } from 'app/notes/doc-editor/blocks/block-common';

@Component({
	selector: 'app-placeholder-block',
	templateUrl: './placeholder-block.html',
	styleUrls: ['./placeholder-block.css']
})
export class PlaceholderBlockComponent implements OnInit, IEditorBlock, OnDestroy {
	public blockID: string;
	public blockHostRef: IEditorBlockHost;

	constructor() { }

	ngOnInit() {
	}
	ngOnDestroy(): void {
		console.log("destroyed!");
	}
	serialize(): string {
		throw new Error("Method not implemented.");
	}
	requestedCols(): number { return 2; }
	public showBlocksList() {
		this.blockHostRef.showListOfBlocks(this.blockID);
	}
	getEditorBlockActions(): IEditorBlockAction[] {
		return null;
	}
}
