import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Subject, Observable } from 'rxjs';
import { ConfigService } from "app/services/config.service";
import { APIResponse } from 'app/services/api/api.service';
import { GQLResult, GQLError } from './api/QueryResponses';

class GraphQLQuery {
	variables: any;
	query: string;
	type: string;
	queryHash: string;
}
export class GraphQLObject {
	objectName: string;
	fields?: string[];
}

export class GQLSubject<T> extends Subject<GQLResult<T>>{ }
export class GQLObservable<T> extends Observable<GQLResult<T>> { }

@Injectable()
export class GraphQLService {
	constructor(private http: HttpClient) { }

	public Query<T>(fieldName: string, args: Map<string, any>, fields: GraphQLObject[], operationName: string): GQLObservable<T> {
		var subject: Subject<GQLResult<T>> = new Subject<GQLResult<T>>();
		var apiURL: string = ConfigService.GetAPIURLFor("query");
		var query: string = this.MakeQueryWithObject(fieldName, args, fields, false);
		var q: GraphQLQuery = this.MakeGQLQueryString(query, "query");
		var cacheHash: string = operationName;

		if (operationName == "") { cacheHash = q.query; }

		this.getQueryHash(cacheHash).then(res => {
			q.queryHash = this.hex(res);
			this.http.post(apiURL/*+"/"+q.queryHash*/, JSON.stringify(q)).subscribe(data => {
				let r = <any>data;
				let ret: GQLResult<T> = new GQLResult();
				if (r.data != null) { ret.data = r.data as T; }
				else { ret.errors = r.errors as GQLError[]; }
				subject.next(ret);
			});
		});
		return subject;
	}
	public Mutation(fieldName: string, args: Map<string, any>, fields: GraphQLObject[], operationName: string): Observable<boolean> {
		var subject: Subject<boolean> = new Subject<boolean>();
		var apiURL: string = ConfigService.GetAPIURLFor("query");
		var query: string = this.MakeQueryWithObject(fieldName, args, fields, true);
		var q: GraphQLQuery = this.MakeGQLQueryString(query, "mutation");
		var cacheHash: string = operationName;

		if (operationName == "") { cacheHash = q.query; }

		this.getQueryHash(cacheHash).then(res => {
			q.queryHash = this.hex(res);
			this.http.post<APIResponse>(apiURL, JSON.stringify(q)).subscribe(data => {
				if (data.status == "success") {
					subject.next(true);
				} else if (data.status == "failed") {
					subject.next(false);
				}
			}, error => { subject.next(false); });
		});
		return subject;
	}
	public MutationWithReturn<T>(fieldName: string, args: Map<string, any>, fields: GraphQLObject[], operationName: string): GQLObservable<T> {
		var subject: Subject<GQLResult<T>> = new Subject();
		var apiURL: string = ConfigService.GetAPIURLFor("query");
		var query: string = this.MakeQueryWithObject(fieldName, args, fields, true);
		var q: GraphQLQuery = this.MakeGQLQueryString(query, "mutation");
		var cacheHash: string = operationName;

		if (operationName == "") { cacheHash = q.query; }

		this.getQueryHash(cacheHash).then(res => {
			q.queryHash = this.hex(res);
			this.http.post(apiURL, JSON.stringify(q)).subscribe(data => {
				let r = <any>data;
				let ret: GQLResult<T> = new GQLResult();
				if (r.data != null) { ret.data = r.data as T; }
				if (r.errors != null) { ret.errors = r.errors as GQLError[]; }
				else { ret.errors = new Array(); }
				subject.next(ret);
			});
		});
		return subject;
	}
	private MakeGQLQueryString(query: string, opType: string): GraphQLQuery {
		var gqlQuery: GraphQLQuery = {
			variables: null,
			query: query,
			type: opType,
			queryHash: "",
		};
		return gqlQuery;
	}
	private async getQueryHash(query: string): Promise<ArrayBuffer> {
		const encoder = new TextEncoder();
		const data = encoder.encode(query);
		return await window.crypto.subtle.digest("SHA-256", data);
	}
	private hex(buffer: ArrayBuffer): string {
		var digest = '';
		var view = new DataView(buffer);
		for (var i = 0; i < view.byteLength; i += 4) {
			var value = view.getUint32(i);
			var stringValue = value.toString(16);
			var padding = '00000000';
			var paddedValue = (padding + stringValue).slice(-padding.length);
			digest += paddedValue;
		}
		return digest;
	}
	private MakeQueryWithObject(name: string, args: Map<string, any>, fields: GraphQLObject[], isMutation: boolean): string {
		var index: number = 0;
		var elementHasFields: boolean = false;
		var query: string = "{ " + name;
		if (isMutation) { query = "mutation { " + name; }
		if (args != null) {
			query += "(";
			args.forEach((value, key, m) => {
				if (Array.isArray(value)) { query += key + ": [" + value.toString() + "]"; }
				else { query += key + ": " + value; }
				if (index < args.size - 1) { query += ", "; }
				index++;
			});
			query += ")";
		}
		if (fields != null && fields.length > 0) {
			query += " { ";
			fields.forEach(element => {
				query += element.objectName;
				if (element.fields != null) {
					elementHasFields = true;
					query += " { ";
					element.fields.forEach(e => {
						query += e + " ";
					});
					query += "}";
				} else { query += " "; }
			});
		}
		if (elementHasFields) { query += "} }"; }
		else {
			if (fields.length == 0) { query += "}"; }
			else { query += "} }"; }
		}
		return query;
	}
}