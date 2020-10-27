import { Component, ViewContainerRef, ViewChild,
		 Input, ComponentFactoryResolver, Injector } from "@angular/core";

@Component({
	selector: 'treeview-item',
	template: `<span #itemHost></span>`
})
export class TreeViewItemHost {
	private hostedItem: any;
	@ViewChild("itemHost", { read: ViewContainerRef, static: true }) private itemHost: ViewContainerRef;

	constructor(private resolve: ComponentFactoryResolver, private inject: Injector) {}
	@Input() set HostedItem(item: any) {
		if (typeof item !== "string") {
			this.hostedItem = item;
			this.itemHost.insert(this.hostedItem.hostView);
		}
	}
}