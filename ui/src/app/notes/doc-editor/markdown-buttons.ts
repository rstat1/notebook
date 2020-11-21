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
		if (this.handleButtonClick()) { return; }

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
	getForm(): HTMLElement {
		console.log("getForm");
		return document.createElement('div');
	}
	abstract getButtonName(): string;
	abstract getButtonContent(): string;
	abstract handleButtonClick(): boolean;
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
	handleButtonClick(): boolean { return false; }
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
	handleButtonClick(): boolean { return false; }
}

export class MDStrikeButton extends MDButtonBase {
	getButtonName(): string {
		return 'md-strike'
	}
	getButtonContent(): string {
		return "<b><strike>S</strike</b>"
	}
	getModifiedContents(selectionContent: string): string {
		if (selectionContent.startsWith("~~") == true && selectionContent.endsWith("~~") == true) {
			selectionContent = selectionContent.replace(/\~/g, "");
			return selectionContent;
		} else {
			selectionContent = selectionContent.padStart(selectionContent.length + 1, "~~");
			selectionContent = selectionContent.padEnd(selectionContent.length + 1, "~~");
			return selectionContent;
		}
	}
	hasModifiedContents(selectionContent: string): boolean {
		return selectionContent.startsWith("~~") == true && selectionContent.endsWith("~~") == true
	}
	handleButtonClick(): boolean { return false; }
}

export class MDCodeButton extends MDButtonBase {
	private form: HTMLElement = null;
	getButtonName(): string {
		return "md-code";
	}
	getButtonContent(): string {
		return '<i class="fa fa-code"></i>';
	}
	getModifiedContents(selectionContent: string): string {
		return "";
	}
	hasModifiedContents(selectionContent: string): boolean {
		return false;
	}
	handleButtonClick(): boolean {
		var toolbarExt = this.base.getExtensionByName("toolbar");
		if (this.form == null) {
			this.createForm();
		}

		if (this.form.classList.contains("medium-editor-toolbar-form-active")) {
			this.form.classList.remove("medium-editor-toolbar-form-active");
			toolbarExt.showToolbarDefaultActions();
			(<HTMLElement>toolbarExt.toolbar).removeChild(this.form);
		} else {
			this.form.classList.add("medium-editor-toolbar-form-active");
			toolbarExt.hideToolbarDefaultActions();
			toolbarExt.toolbar.appendChild(this.form);
		}

		return true;
	}
	private languageSelected(event: any) {
		var modifiedContents: string;
		var fragment: DocumentFragment;
		var selection = document.getSelection();
		var selectionRange = selection.getRangeAt(0)
		var toolbarExt = this.base.getExtensionByName("toolbar");
		var contents: string = selectionRange.cloneContents().textContent;
		var langSelect: HTMLSelectElement = this.form.querySelector("#language-selector");

		toolbarExt.showToolbarDefaultActions();
		(<HTMLElement>toolbarExt.toolbar).removeChild(this.form);
		this.form.classList.remove("medium-editor-toolbar-form-active");

		selectionRange.deleteContents();
		modifiedContents = '```' + langSelect.selectedOptions[0].value + '\n' + contents + '\n' + '```';
		fragment = selectionRange.createContextualFragment(modifiedContents);

		selectionRange.insertNode(fragment);
		this.base.checkContentChanged();
	}
	private createForm() {
		this.form = document.createElement("div");
		var template: string[] = [
			'<select id="language-selector" class="medium-editor-toolbar-input" placeholder="Select a language">'
		];

		template.push('<option value="">Select a language</option>')
		template.push('<option value="csharp">C#</option>');
		template.push('<option value="typescript">Typescript</option>');
		template.push('<option value="css">CSS</option>');
		template.push('<option value="go">Go</option>');
		template.push('<option value="cpp">C++</option>');
		template.push('<option value="html">HTML</option>');
		template.push('<option value="javascript">Javascript</option>');
		template.push('</select>');

		this.form.className = "medium-editor-toolbar-form";
		this.form.innerHTML = template.join('');

		var langSelect: HTMLElement = this.form.querySelector("#language-selector");
		this.base.on(langSelect, 'input', this.languageSelected.bind(this), false);
	}
}

export class MDListButton extends MDButtonBase {
	getButtonName(): string {
		throw new Error('Method not implemented.');
	}
	getButtonContent(): string {
		throw new Error('Method not implemented.');
	}
	getModifiedContents(selectionContent: string): string {
		throw new Error('Method not implemented.');
	}
	hasModifiedContents(selectionContent: string): boolean {
		throw new Error('Method not implemented.');
	}
	handleButtonClick(): boolean { return false; }
}