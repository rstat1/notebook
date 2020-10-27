import { Subject, Observable } from 'rxjs';
import { Component, Input, OnInit } from '@angular/core';

export class TreeItem {
	Root: boolean;
	ItemTemplate: any;
	Children?: TreeItem[];
	Expanded?: boolean;
	ClickHandler?: (value: TreeItem) => void;
}

@Component({
	selector: 'treeview',
	templateUrl: './treeview.component.html',
	styleUrls: ['./treeview.component.css']
})
export class TreeViewComponent {
	@Input() public nodes: TreeItem[];
	@Input() public allowCollapse: boolean;
	@Input() public isChildTree: boolean;

	private itemClicked: Subject<TreeItem>;
	private itemWasDoubleClicked: Subject<TreeItem>;

	public ItemClicked: Observable<TreeItem>;
	public ItemDoubleClicked: Observable<TreeItem>;

	constructor() {
		this.itemWasDoubleClicked = new Subject<TreeItem>();
		this.itemClicked = new Subject<TreeItem>();
		this.ItemDoubleClicked = this.itemWasDoubleClicked.asObservable();
	}
	private toggleExpand(item: TreeItem) {
		item.Expanded = !item.Expanded;
	}
	private childDoubleClicked(item: TreeItem, e: MouseEvent) {
		if (item.ClickHandler != null) {
			item.ClickHandler(item);
		}
	}
	private itemDoubleClicked(e: MouseEvent) {
		//	item.ClickHandler(item.ItemContent);
		//this.itemWasDoubleClicked.next(item);
	}
}