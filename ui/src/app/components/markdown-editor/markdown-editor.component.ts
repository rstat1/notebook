import { Component, OnInit } from '@angular/core';

@Component({
	selector: 'markdown-editor',
	templateUrl: './markdown-editor.html',
	styleUrls: ['./markdown-editor.css']
})
export class MarkdownEditorComponent implements OnInit {
	public editorText: string = "";
	public scrollbarOptions = {
		scrollInertia: 0,
		theme: 'dark',
		scrollbarPosition: "inside",
		alwaysShowScrollbar: 0,
		autoHideScrollbar: true,
	};
	constructor() { }

	ngOnInit() {
	}
	public removeHTML(event: ClipboardEvent) {
		var editor = document.getElementById("editor");
		var es = document.getElementById("editor-stage");
		var pastedText = event.clipboardData.getData("text/html");
		if (pastedText != "") {
			event.preventDefault();
			es.innerHTML = pastedText;
			setTimeout(() => {
				this.editorText = this.getText(es);
				editor.innerText = this.editorText;
				es.innerHTML = null;
			}, 1);
		}
	}
	//https://stackoverflow.com/questions/20365465/extract-text-from-html-while-preserving-block-level-element-newlines/20384452#20384452
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
			// Replace repeated spaces, newlines, and tabs with a single space.
			result = node.nodeValue; //.replace( /\s+/g, '' );
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
}