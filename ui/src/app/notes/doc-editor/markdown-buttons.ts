///<reference path="medium-editor.d.ts" />"
import { MediumEditor } from 'medium-editor';

export abstract class MDButtonBase implements MediumEditor.Extension {
	name: string;
	base: MediumEditor;
	private button: HTMLElement;

	init(): void {
		this.name = this.getButtonName();
		this.button = document.createElement("button");
		this.button.classList.add("medium-editor-action");
		this.button.innerHTML = this.getButtonContent();

		this.base.on(this.button, 'click', this.handleClick.bind(this), false);
	}
	isActive(): boolean {
		return this.button.classList.contains("medium-editor-button-active")
	}
	setActive(): void {
		this.button.classList.add("medium-editor-button-active")
	}
	setInactive(): void {
		this.button.classList.remove("medium-editor-button-active")
	}
	getButton(): HTMLElement {
		return this.button;
	}
	handleClick(event: any): void {
		var modifiedContents: string;
		var fragment: DocumentFragment;
		var selection = document.getSelection();
		var selectionRange = selection.getRangeAt(0)
		var contents: string = selectionRange.cloneContents().textContent;
		selectionRange.deleteContents();

		modifiedContents = this.getModifiedContents(contents);
		fragment = selectionRange.createContextualFragment(modifiedContents);

		if (this.hasModifiedContents(modifiedContents)) {
			this.setActive();
		} else {
			this.setInactive();
		}

		selectionRange.insertNode(fragment);
		this.base.checkContentChanged();
	}
	isAlreadyApplied(node: Node): boolean {
		var sel = document.getSelection();
		var range = sel.getRangeAt(0)

		var contents = range.cloneContents().textContent;
		return this.hasModifiedContents(contents);
	}
	abstract getButtonName(): string;
	abstract getButtonContent(): string;
	abstract getModifiedContents(selectionContent: string): string;
	abstract hasModifiedContents(selectionContent: string): boolean;
}

export class MDBoldButton extends MDButtonBase {
	getButtonName(): string {
		return "md-bold";
	}
	getButtonContent(): string {
		return "<b>B</b>";
	}
	getModifiedContents(selectionContent: string): string {
		if (selectionContent.startsWith("**") == true && selectionContent.endsWith("**") == true) {
			selectionContent = selectionContent.replace(/\*\*/g, "");
			return selectionContent;
		} else {
			selectionContent = selectionContent.padStart(selectionContent.length + 2, "**");
			selectionContent = selectionContent.padEnd(selectionContent.length + 2, "**");
			return selectionContent;
		}
	}
	hasModifiedContents(selectionContent: string): boolean {
		return selectionContent.startsWith("**") == true && selectionContent.endsWith("**") == true
	}
}

export class MDItalicButton extends MDButtonBase {
	getButtonName(): string {
		return "md-italic"
	}
	getButtonContent(): string {
		return "<b>I</b>"
	}
	getModifiedContents(selectionContent: string): string {
		if (selectionContent.startsWith("_") == true && selectionContent.endsWith("_") == true) {
			selectionContent = selectionContent.replace(/\_/g, "");
			return selectionContent;
		} else {
			selectionContent = selectionContent.padStart(selectionContent.length + 1, "_");
			selectionContent = selectionContent.padEnd(selectionContent.length + 1, "_");
			return selectionContent;
		}
	}
	hasModifiedContents(selectionContent: string): boolean {
		return selectionContent.startsWith("_") == true && selectionContent.endsWith("_") == true
	}

}

export class MDStrikeButton extends MDButtonBase {
	getButtonName(): string {
		return 'md-strike'
	}
	getButtonContent(): string {
		return "<b><strike>S</strike</b>"
	}
	getModifiedContents(selectionContent: string): string {
		return "";
	}
	hasModifiedContents(selectionContent: string): boolean {
		return false;
	}
}