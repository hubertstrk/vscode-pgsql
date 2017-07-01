/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as path from 'path';
import PostgresqlCompletionItemProvider from './features/completionProvider';
import PostgresqlSignatureHelpProvider from './features/signatureHelpProvider';
import pgsqlCommandProvider from './features/commandProvider';

import * as vscode from 'vscode';
// import { workspace, Disposable, ExtensionContext } from 'vscode';
import { LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, TransportKind } from 'vscode-languageclient';

let previewUri = vscode.Uri.parse('css-preview://authority/css-preview');

export function activate(context: vscode.ExtensionContext) {

	// preview window
	class TextDocumentContentProvider implements vscode.TextDocumentContentProvider {
		private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

		public provideTextDocumentContent(uri: vscode.Uri): string {
			return htmlResult
		}

		get onDidChange(): vscode.Event<vscode.Uri> {
			return this._onDidChange.event;
		}

		public update(uri: vscode.Uri) {
			this._onDidChange.fire(uri);
		}
	}
	
	// keeps the psql result as html
	let htmlResult = ''
	let provider = new TextDocumentContentProvider();
	let registration = vscode.workspace.registerTextDocumentContentProvider('css-preview', provider);

	// The server is implemented in node
	let serverModule = context.asAbsolutePath( path.join('server', 'server.js') )
	// The debug options for the server
	let debugOptions = { execArgv: ["--nolazy", "--debug=6004"] };
	
	// If the extension is launch in debug mode the debug server options are use
	// Otherwise the run options are used
	let serverOptions: ServerOptions = {
		run : { module: serverModule, transport: TransportKind.ipc },
		debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
	}
	
	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
        
		documentSelector: ['pgsql'],
		synchronize: {
			// Synchronize the setting section 'languageServerExample' to the server
			configurationSection: 'languageServerExample',
			// Notify the server about file changes to '.clientrc files contain in the workspace
			fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
		}
	}
	
	// Create the language client and start the client.
	let disposable = new LanguageClient('Language Server Example', serverOptions, clientOptions).start();
	
	// Push the disposable to the context's subscriptions so that the 
	// client can be deactivated on extension deactivation 

    let pgsqlcp = new pgsqlCommandProvider()
	pgsqlcp.RegisterCallback(function(result) {
		htmlResult = result

		// siganlize preview window that new psql result has been received
		provider.update(previewUri)
	})

	pgsqlcp.activate( context.subscriptions )
    
	context.subscriptions.push( vscode.commands.registerCommand( 'pgsql.run', () => {
		pgsqlcp.run()
	}))

   	context.subscriptions.push(vscode.languages.registerCompletionItemProvider(['pgsql'], new PostgresqlCompletionItemProvider(), '.', ' ')); 
	context.subscriptions.push(vscode.languages.registerSignatureHelpProvider('pgsql', new PostgresqlSignatureHelpProvider(), '(', ','));
	context.subscriptions.push(disposable); 
}