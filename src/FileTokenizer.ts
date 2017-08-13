import * as assert from 'assert'
import * as Collections from 'typescript-collections';

import {LineTokenizer} from './LineTokenizer';
import {TokenType, Token} from './Token';

enum FileState {
    Initial,
    FileHeader,
    InterTune,
    FreeText,
    TypesetText,
    TuneHeader,
    TuneBody
}
namespace FileState {
    export function isInTune(state: FileState): boolean {
        switch (state) {
            case FileState.TuneHeader:
            case FileState.TuneBody:
                return true;
            default:
                return false;
        }
    }
}

export class FileTokenizer {
    private state: FileState = FileState.Initial;
    private tokenizer: LineTokenizer;
    private savedInToken: Token|undefined;
    private outQueue = new Collections.Queue<Token>();
    private gotK: boolean = false;
    

    constructor(inputData: string) {
        this.tokenizer = new LineTokenizer(inputData);
    }
    
    private error(token: Token, messageId: string): void {
        console.log("At %s:%s, %s", token.lineNumber, token.charNumber, messageId);
    }

    public getToken(): Token {
        let token: Token|undefined;
        while ((token = this.getTokenInternal()) == undefined) {
            // do nothing
        }
        return token;
    }

    private getTokenInternal(): Token|undefined {
        let token: Token|undefined;

        // Previous operation queued up a token ready to go
        if (!this.outQueue.isEmpty()) {
            return this.outQueue.dequeue();
        }

        // Previous operation deferred processing of an incoming token
        if (this.savedInToken) {
            token = this.savedInToken;
            this.savedInToken = undefined;
        } else {
            token = this.tokenizer.getToken(FileState.isInTune(this.state));
        }

        if (token.type === TokenType.EOF || token.type === TokenType.Comment) {
            return token;
        }

        assert(!(token.type === TokenType.AbcDeclaration && this.state !== FileState.Initial));
        assert(!(token.type === TokenType.MusicCode && !FileState.isInTune(this.state)));
        assert(!(token.type === TokenType.FreeText && FileState.isInTune(this.state)));
        
        switch (this.state) {
            case FileState.Initial:
                switch (token.type) {
                    case TokenType.AbcDeclaration:
                        if (token.value !== "2.1") {
                            this.error(token, "Unsupported version of ABC: '" + token.value + "'");
                            // But carry on
                        }

                        this.state = FileState.FileHeader;
                        // Return the current abc declaration and then a file header start
                        let tok = Object.assign({}, token);
                        tok.type = TokenType.FileHeaderStart;
                        tok.value = undefined;
                        this.outQueue.enqueue(tok);
                        break;
                    
                    default:
                        this.state = FileState.FileHeader;
                        // Return a file header start and then process the token
                        this.savedInToken = Object.assign({}, token);
                        token.type = TokenType.FileHeaderStart;
                        token.value = undefined;
                        break;
                }
                break;

            case FileState.FileHeader:
                switch(token.type) {
                    case TokenType.InformationField:
                    case TokenType.StyleSheetDirective:
                        // Do nothing
                        break;

                    case TokenType.BlankLine:
                        this.state = FileState.InterTune;
                        // Convert blank line into tune header end
                        token.type = TokenType.FileHeaderEnd;
                        token.value = undefined;
                        break;

                    case TokenType.FreeText:
                        this.error(token, "Unrecognized text in the file header. The file header must be completed with a blank line before free text is allowed");
                        // TODO: Figure out what to do here
                        break;

                    case TokenType.MusicCode:
                        assert.fail("LineTokenizer returned music code outside of a tune");
                        break;
                }
                break;

            case FileState.InterTune:
                switch(token.type) {
                    case TokenType.InformationField:
                        if (!token.value!.startsWith("X:")) {
                            this.error(token, "Got information line to start a tune, but it is not X: '" + token.value + "'");
                            // But carry on
                        }

                        this.state = FileState.TuneHeader;
                        // Return a tune header start and then process the token
                        this.savedInToken = Object.assign({}, token);
                        token.type = TokenType.TuneHeaderStart;
                        token.value = undefined;
                        break;
                    
                    case TokenType.StyleSheetDirective:
                        // Unclear if this is allowed. TODO: Check this
                        break;

                    case TokenType.BlankLine:
                        // Swallow the blank line token
                        token = undefined;
                        break;

                    case TokenType.FreeText:
                        this.state = FileState.FreeText;
                        break;
                }
                break;
        
            case FileState.FreeText:
                switch(token.type) {
                    case TokenType.FreeText:
                        // Do nothing
                        break;

                    case TokenType.BlankLine:
                        this.state = FileState.InterTune;
                        // Swallow the blank line token
                        token = undefined;                                                
                        break;
                        
                    case TokenType.InformationField:
                    case TokenType.StyleSheetDirective:
                        this.error(token, "Free text must be separated from abc tunes, typeset text and the file header by empty lines");
                        break;
                }
                break;

            case FileState.TypesetText:
                switch(token.type) {
                    case TokenType.InformationField:
                    case TokenType.StyleSheetDirective:
                    case TokenType.BlankLine:
                    case TokenType.FreeText:
                    case TokenType.MusicCode:
                }
                break;

            case FileState.TuneHeader:
                switch(token.type) {
                    case TokenType.InformationField:
                        if (token.value!.startsWith("K:")) {
                            this.gotK = true;
                        } else if (this.gotK) {
                            this.error(token, "Found field information line after a K:");                            
                        }
                        // Do nothing
                        break;

                    case TokenType.StyleSheetDirective:
                        // Do nothing;
                        break;

                    case TokenType.BlankLine:
                        // No tune body
                        this.state = FileState.InterTune;
                        // Convert blank line into tune header end
                        token.type = TokenType.TuneHeaderEnd;
                        token.value = undefined;
                        break;

                    case TokenType.MusicCode:
                        if (!this.gotK) {
                            this.error(token, "Missing K: line to finish tune header");
                        }
                        this.gotK = false;
                        this.state = FileState.TuneBody;

                        // Return a tune header end then a tune body start then process this token
                        this.savedInToken = Object.assign({}, token);

                        token.type = TokenType.TuneHeaderEnd;
                        token.value = undefined;

                        let tok = Object.assign({}, token);
                        tok.type = TokenType.TuneBodyStart;
                        tok.value = undefined;
                        this.outQueue.enqueue(tok);
                        break;                    
                }
                break;

            case FileState.TuneBody:        
                switch(token.type) {
                    case TokenType.InformationField:
                    case TokenType.StyleSheetDirective:
                    case TokenType.MusicCode:
                        // Do nothing
                        break;

                    case TokenType.BlankLine:
                        this.state = FileState.InterTune;
                        // Convert blank line into tune body end
                        token.type = TokenType.TuneBodyEnd;
                        token.value = undefined;
                        break;                    
                }
                break;
        }

        return token;
    }
}