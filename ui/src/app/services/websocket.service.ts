import { Subject, Observable } from 'rxjs';
import { Injectable, OnDestroy } from '@angular/core'

import { ConfigService } from 'app/services/config.service';
import { APIService } from 'app/services/api/api.service';
import { AuthService } from 'app/services/auth/auth.service';

export class Subscription {
	public SingleMessage: boolean;
	public Handler: (message: string) => void;
	constructor(handler: (message: string) => void, oneOff: boolean) {
		this.Handler = handler;
		this.SingleMessage = oneOff;
	}
}

@Injectable()
export class WebSocketClient implements OnDestroy {
	public IsConnected: Observable<boolean>;
	public FailedToConnect: Observable<boolean>;
	public connectionAttempts: number = 0;

	private socket: WebSocket;
	private connected: boolean = false;
	private ValidMessageTypes: Array<string> = [ "BACKUPMSG", "RESTORMSG", "IMPORTMSG" ];
	private messageSubscriptions: Map<string, Subscription>;

	private isConnected: Subject<boolean>;
	private connectFailed: Subject<boolean>;

	constructor(private api: APIService, private auth: AuthService) {
		this.isConnected = new Subject<boolean>();
		this.connectFailed = new Subject<boolean>();

		this.IsConnected = this.isConnected.asObservable();
		this.FailedToConnect = this.connectFailed.asObservable();

		this.messageSubscriptions = new Map<string, Subscription>();
	}
	ngOnDestroy() {
		this.SendMessageInternal("DISCONNECT:", this.auth.CurrentUser);
		// this.socket.close(1000, "rstat1");
	}
	public SubscribeToMessage(prefix: string, oneOff: boolean, handler: (message: string) => void) {
		if (this.ValidMessageTypes.includes(prefix) == true) {
			let sub: Subscription = new Subscription(handler, oneOff);
			this.messageSubscriptions[prefix] = sub;
		} else {
			console.error("no such message");
		}
	}
	public SendMessage(messageType: string, args: string) {
		if (!this.connected) {
			this.Connect();
		}
		else { this.SendMessageInternal(messageType, args); }
	}
	public Connect() {
		if (this.socket == undefined) {
			this.api.GetWSAuthTicket().subscribe(resp => {
				if (resp.status == "success") {
					this.socket = new WebSocket(ConfigService.GetWSURLFor("ws?t=" + resp.response), "dcstatus");
					this.socket.onmessage = event => { this.OnMessageReceived(event); }
					this.socket.onopen = event => {
						console.log("connect");
						this.connected = true;
						this.isConnected.next(true);
						this.connectionAttempts = 0;
					};
					this.socket.onclose = event => {
						this.socket = undefined;
						console.log("connectionLost");
						this.isConnected.next(false);
						this.connectionLost();
					};
				}
			}, error => {
				if (error.error.response == "token invalid") {
					this.isConnected.next(true);
				}
				else {
					console.log("connectionLost-wsauth");
			 		console.error(error);
					this.connectionLost();
				}
			});
		}
	}
	private SendMessageInternal(messageType: string, args: string) {
		if (this.ValidMessageTypes.includes(messageType) == true) {
			this.socket.send(messageType + ":" + args);
		}
		else { console.error("Invalid Message: " + messageType); }
	}
	private OnMessageReceived(event: MessageEvent): any {
		let handler: Subscription;
		let data = event.data as string;
		let cmd = data.substring(0, data.indexOf(":") + 1).replace(":", "");
		let args = data.replace(cmd + ":", "");

		if (this.messageSubscriptions[cmd] !== undefined) {
			handler = this.messageSubscriptions[cmd];
			if (args !== "") { handler.Handler(args); }
		 	else { handler.Handler(null); }
		 	if (handler.SingleMessage) { this.messageSubscriptions.delete(args[0]); }
		}
		else { console.log("No handler found for " + cmd); }
	}
	private connectionLost() {
		if (this.connectionAttempts <= 4) {
			setTimeout(this.connectionAttempt, 2500, this)
		}
		else { this.connectFailed.next(true); }
	}
	public connectionAttempt(socketRef: WebSocketClient) {
		socketRef.Connect();
		socketRef.connectionAttempts++;
	}
}