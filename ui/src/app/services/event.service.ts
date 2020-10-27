import { Subject } from 'rxjs';
import { Injectable } from '@angular/core';

@Injectable()
export class EventService {
	private knownEvents: string[] = new Array();
	private eventHandlers: Map<string, Array<Subject<void>>> = new Map();
	private eventHandlersWithArgs: Map<string, Array<Subject<any>>> = new Map();

	constructor() {  }
	public RegisterEvent(eventName: string) {
		if (this.knownEvents.includes(eventName, 0) == false) {
			this.knownEvents.push(eventName);
		}
	}
	public RegisterEventHandler(eventName: string, handler: Subject<void>) {
		// let eventHandlers: Array<Subject<void>>;
		// if (this.knownEvents.includes(eventName, 0)) {
		// 	if (this.eventHandlers.has(eventName)) {
		// 		eventHandlers = this.eventHandlers[eventName];
		// 		eventHandlers.push(handler);
		// 		this.eventHandlers.set(eventName, eventHandlers);
		// 	} else {
		// 		this.eventHandlers.set(eventName, [ handler ]);
		// 	}
		// }
	}
	public RegisterEventHandlerWithArgs(eventName: string, handler: Subject<any>) {
		if (this.knownEvents.includes(eventName, 0)) {
			if (this.eventHandlersWithArgs.has(eventName)) {
				let eventHandlers: Array<Subject<any>> = this.eventHandlersWithArgs[eventName];
				eventHandlers.push(handler);
				this.eventHandlersWithArgs.set(eventName, eventHandlers);
			} else {
				this.eventHandlersWithArgs.set(eventName, [ handler ]);
			}
		}
	}
	public TriggerEvent(eventName: string) {
		if (this.knownEvents.includes(eventName, 0) == true) {
			if (this.eventHandlers.has(eventName)) {
				let handlers: Array<Subject<void>> = this.eventHandlers.get(eventName);
				if (handlers != null) {
					handlers.forEach(element => { element.next(); });
				}
			}
		}
	}
	public TriggerEventWithArgs(eventName: string, args: any) {
		if (this.knownEvents.includes(eventName, 0) == true) {
			if (this.eventHandlersWithArgs.has(eventName)) {
				let handlers: Array<Subject<any>> = this.eventHandlers.get(eventName);
				if (handlers != null) {
					handlers.forEach(element => { element.next(); });
				}
			}
		}
	}
}