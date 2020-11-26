import { ActivatedRoute } from '@angular/router';
import { Component, OnInit } from '@angular/core';

import { APIService } from 'app/services/api/api.service';
import { SharedPageResponse } from 'app/services/api/QueryResponses';

@Component({
	selector: 'app-shared-note',
	templateUrl: './shared-note.component.html',
	styleUrls: ['./shared-note.component.css']
})
export class SharedNoteComponent implements OnInit {
	public lastEdit: string;
	public pageTitle: string = '';
	public pageContent: string = '';
	public scrollbarOptions = { scrollInertia: 0, theme: 'dark', scrollbarPosition: "inside", alwaysShowScrollbar: 0, autoHideScrollbar: true };

	constructor(private route: ActivatedRoute, private api: APIService) { }

	ngOnInit(): void {
		this.route.params.subscribe((params) => {
			this.api.GetSharedPage(params.sharedID).subscribe(resp => {
				var sharedPage: SharedPageResponse = JSON.parse(resp.response);
				this.pageTitle = sharedPage.title;
				this.lastEdit = sharedPage.lastEdit;
				this.pageContent = sharedPage.content;
			});
		});
	}

}
