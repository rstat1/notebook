import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TreeViewItemHost } from './treeitemhost'
import { TreeViewComponent } from './treeview.component'

@NgModule({
	imports: [
		CommonModule
	],
	declarations: [
		TreeViewItemHost,
		TreeViewComponent,
	],
	exports: [
		TreeViewItemHost,
		TreeViewComponent,
	]
})
export class TreeViewModule { }
