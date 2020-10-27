import { Component, OnInit, Input } from '@angular/core';

@Component({
	selector: 'block-list-item',
	templateUrl: './block-list-item.html',
	styleUrls: ['./block-list-item.css']
})
export class BlockListItemComponent implements OnInit {
	@Input() public Icon: string;
	@Input() public ItemText: string;
	@Input() public ItemDescription: string;

	constructor() { }
	ngOnInit() {
	}
}
