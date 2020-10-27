import { Component, OnInit, ViewChild, ViewContainerRef, Input, Inject } from '@angular/core';

import { ICommandListEntry } from 'app/components/command-list/cmd-list-common';
import { IListOverlayConfig } from 'app/notes/list-overlay/list-overlay.common';

@Component({ selector: 'blocks-list-item', template: "<span #itemHost></span>" })
export class BlocksListItem {
	private hostedItem: any;
	@ViewChild("itemHost", { read: ViewContainerRef, static: true }) private itemHost: ViewContainerRef;

	constructor() { }
	@Input() set HostedItem(item: any) {
		if (typeof item !== "string") {
			this.hostedItem = item;
			this.itemHost.insert(this.hostedItem.hostView);
		}
	}
}

@Component({
	selector: 'app-blocks-list',
	templateUrl: './blocks-list.component.html',
	styleUrls: ['./blocks-list.component.css']
})
export class BlocksListComponent implements OnInit {
	public filteredListContent: ICommandListEntry[];

	constructor(@Inject("listOverlayConfig") public config: IListOverlayConfig) {
		this.filteredListContent = config.listContent;
	}

	ngOnInit() {
	}
	public itemClick(cmd: ICommandListEntry) {
		cmd.action(cmd);
	}
}
