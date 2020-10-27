import { Component, OnInit, ViewChild, ElementRef, ComponentRef, ComponentFactoryResolver, Injector } from '@angular/core';
import { CommandListService } from 'app/components/command-list/command-list.service';
import { ICommandListSource, ICommandListEntry } from 'app/components/command-list/cmd-list-common';
import { BlockListItemComponent } from 'app/notes/block-list-item/block-list-item.component';

@Component({
	selector: 'app-notes-root',
	templateUrl: './notes-root.component.html',
	styleUrls: ['./notes-root.component.css']
})
export class NotesRootComponent {
	
}
