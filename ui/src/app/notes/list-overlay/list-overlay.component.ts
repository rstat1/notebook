import { Component, OnInit, ViewChild, ViewContainerRef, Input, Injector, Inject, TemplateRef } from '@angular/core';
import { IListOverlayConfig } from 'app/notes/list-overlay/list-overlay.common';
import { ICommandListEntry } from 'app/components/command-list/cmd-list-common';

// @Component({ selector: 'list-overlay-item', template: '<span *ngIf="!isTemplateRef" #itemHost></span><span *ngIf="isTemplateRef"><ng-container *ngTemplateOutlet="hostedItem"></ng-container></span>' })
// export class ListOverlayItem {
// 	public hostedItem: any;
// 	public isTemplateRef: boolean = false;
// 	@ViewChild("itemHost", { read: ViewContainerRef, static: true }) private itemHost: ViewContainerRef;

// 	constructor() { }
// 	@Input() set HostedItem(item: any) {
// 		if (item instanceof TemplateRef) {
// 			this.isTemplateRef = true;
// 		} else {
// 			this.hostedItem = item;
// 			this.itemHost.insert(this.hostedItem.hostView);
// 		}
// 	}
// }
// template: '<span *ngIf="!isTemplateRef" #itemHost></span><span *ngIf="isTemplateRef"><ng-container *ngTemplateOutlet="hostedItem"></ng-container></span>'
@Component({
	selector: 'list-overlay',
	templateUrl: './list-overlay.component.html',
	styleUrls: ['./list-overlay.component.css']
})
export class ListOverlayComponent implements OnInit {
	public listElementType: string = "component";
	public filteredListContent: ICommandListEntry[];
	constructor(@Inject("listOverlayConfig") public config: IListOverlayConfig) {
		if (config.listElement instanceof TemplateRef) {
			this.listElementType = "template";
		}

		// this.filteredListContent = config.listContent;

	}
	ngOnInit() { }
	itemClick(item: ICommandListEntry) {
		item.action(item);
	}
	filter(filterText: string) {
		var filteredText = filterText.substr(1);
		if (filteredText != "") {
			this.filteredListContent = this.config.listContent.filter(item => item.description.indexOf(filteredText, 0) > -1, this);
		} else {
			console.log(filterText);
			this.filteredListContent = this.config.listContent;
		}
	}
}
