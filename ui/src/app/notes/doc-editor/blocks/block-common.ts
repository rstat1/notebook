import { TemplateRef } from '@angular/core';

export enum BlockActionType {
	Button,
	Toggle,
}
export interface IEditorBlock {
	blockID: string;
	blockHostRef: IEditorBlockHost;
	serialize(): string;
	requestedCols(): number;
	getEditorBlockActions(): IEditorBlockAction[];
}

export interface IEditorBlockAction {
	icon?: string;
	actionText?: string;
	//If this is specified, then you only get one action.
	actionTemplate?: TemplateRef<any>;
	action: () => void;
}

export interface IEditorBlockHost {
	deleteABlock(blockID: string): void;
	showListOfBlocks(blockID: string): void;
	addEditorBlockAction(action: IEditorBlockAction): void;
}