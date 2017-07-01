
import { window, workspace, ViewColumn, OutputChannel, Disposable, Uri, commands } from 'vscode';
import * as ChildProcess from 'child_process';
import LineDecoder from './lineDecoder';
import * as fs from 'fs';
import * as path from 'path';

let previewUri = Uri.parse('css-preview://authority/css-preview');

export default class pgsqlCommandProvider  {
    
    private executable :string = 'psql'
    private connection :string
    private outChannel : OutputChannel;
    private context;
    public htmlResult;

    public activate(subscriptions: Disposable[]) {
        let cp = this
        cp.outChannel = window.createOutputChannel("pgsql")
        workspace.onDidChangeConfiguration( cp.loadConfiguration, cp, subscriptions )
		cp.loadConfiguration()
	}
    
    public loadConfiguration():void  {
        let section = workspace.getConfiguration('pgsql')
		if (section) {
			this.connection = section.get<string>('connection', null)
		}
    }

    public run():void {

        const editor = window.activeTextEditor
        if ( !editor ) return // No any open text editor
        
        const doc = editor.document
        const seltext = doc.getText( editor.selection )
        const text = seltext ? seltext : doc.getText()
        const pgsql = this

        // file already have real filename, just run it via psql
        if ( !doc.isDirty ) return pgsql.runFile( doc.fileName )
        
        // in any others cases, for example if ( doc.isUntitled ) 
        pgsql.runText( text )   
    }
    
    // Create temporary file with given text and execute it via psql
    public runText( text: string ): void {
        
        const pgsql = this
        const rootPath = workspace.rootPath ? workspace.rootPath : __dirname
        const uniqName = path.join( rootPath, ( Date.now() - 0 ) + '.pgsql' )
        
        fs.writeFile( uniqName, text, ( err ) => {
            
           if ( err ) {
               return pgsql.outChannel.appendLine( 'Can\'t create temporary file: ' + uniqName )
           }
           const cb = () => fs.unlink( uniqName, ( err ) => { 
                if ( err ){
                    pgsql.outChannel.appendLine( 'Can\'t delete temporary file: ' + uniqName ) 
                }
           }) 
            pgsql.runFile( uniqName, cb )
        })
    }

    public runFile( fileName: string, cb?: Function ): void {
        let pgsql = this,
            args = [  
                "-d", pgsql.connection,
                "-f", fileName,
                "-H"
            ]

        pgsql.outChannel.show( ViewColumn.Two )

        let cp = ChildProcess.spawn( pgsql.executable, args )

        if ( !cp.pid ){
            return pgsql.outChannel.appendLine( 'pgsql: can\'t spawn child proceess' )    
        }
        
        //args.unshift( pgsql.executable )
        //console.log( args.join(" ") )
        
        cp.on( 'error', ( err: Error ) => {
            
            let ecode: string = (<any>err).code 
            let defmsg = `Failed to run: ${pgsql.executable} ${args.join(' ')}. ${ecode}.`
            let message: string = err.message || defmsg
            
            if ((<any>err).code === 'ENOENT') {
                message = `The 'psql' program was not found. Please ensure the 'psql' is in your Path`
            } 
            window.showInformationMessage( message )
            if ( cb ) cb()
        });

        let decoder = new LineDecoder()
        pgsql.outChannel.show( ViewColumn.Two )
        
        cp.stdout.on('data', (data) => {
            let result = ''
            decoder.write(data).forEach( function (line:string) {
                // pgsql.outChannel.appendLine( line )
                result += line // collect the result
            })
            
            // store result
            this.htmlResult = result 
            
            // callback to preview window
            this.onResult()
            
            return commands.executeCommand('vscode.previewHtml', previewUri, ViewColumn.Two, 'CSS Property Preview').then((success) => {
            }, (reason) => {
                window.showErrorMessage(reason);
            });
        })
        
        cp.stderr.on('data', ( data ) => {
            decoder.write( data ).forEach( function (line:string) {
                pgsql.outChannel.appendLine( line )
            })
        })

        // cp.stdout.on('end', () => {
        //     pgsql.outChannel.appendLine('pgsql end.')
        //     if ( cb ) cb()
        // })
    }

    // Result received fom psql cli
    public onResult() {
        this.Action(this.htmlResult)
    }

    // Register callback for preview window
    private Action
    public RegisterCallback(action) {
        this.Action = action
    }
}