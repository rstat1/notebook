import { Component, OnInit } from '@angular/core';
import { MatIconRegistry } from '@angular/material';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';

import { Book } from 'angular-feather/icons';
import { APIService } from 'app/services/api/api.service';
import { NotebookReference } from 'app/services/api/QueryResponses';
import { AuthService } from 'app/services/auth/auth.service';
import { DataCacheService } from 'app/services/data-cache.service';

@Component({
	selector: 'app-notes-root',
	templateUrl: './notes-root.component.html',
	styleUrls: ['./notes-root.component.css']
})
export class NotesRootComponent implements OnInit {
	public notebooks: NotebookReference[];
	public notebookListVisible: boolean = false;
	constructor(public authService: AuthService, private api: APIService, private router: Router,
		private matIconRegistry: MatIconRegistry, private domSanitizer: DomSanitizer, private cache: DataCacheService) { }

	ngOnInit(): void {
		this.matIconRegistry.addSvgIconLiteral("feather_book", this.domSanitizer.bypassSecurityTrustHtml(Book));
	}
	public showList() {
		this.notebookListVisible = !this.notebookListVisible;
	}
}