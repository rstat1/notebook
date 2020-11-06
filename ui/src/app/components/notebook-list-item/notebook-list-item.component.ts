import { Component, Input, OnInit } from '@angular/core';
import { MatIconRegistry } from '@angular/material';
import { DomSanitizer } from '@angular/platform-browser';
import { FilePlus, BookOpen, Trash2 } from 'angular-feather/icons';


@Component({
	selector: 'notebook-list-item',
	templateUrl: './notebook-list-item.component.html',
	styleUrls: ['./notebook-list-item.component.css']
})
export class NotebookListItemComponent implements OnInit {
	@Input() public id: string;
	@Input() public title: string = "Untitled Space Story";
	public titleInitials: string;

	constructor(private matIconRegistry: MatIconRegistry, private domSanitizer: DomSanitizer) { }
	ngOnInit() {
		this.titleInitials = this.title.substring(0, 2);
		this.matIconRegistry.addSvgIconLiteral("feather_openbook", this.domSanitizer.bypassSecurityTrustHtml(BookOpen));
		this.matIconRegistry.addSvgIconLiteral("feather_trash2", this.domSanitizer.bypassSecurityTrustHtml(Trash2));
		this.matIconRegistry.addSvgIconLiteral("feather_fileplus", this.domSanitizer.bypassSecurityTrustHtml(FilePlus));
	}
}
