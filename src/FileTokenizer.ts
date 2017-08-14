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

export declare type FileTokenizerCB = (tok: Token) => void;

export class FileTokenizer {
    private state: FileState = FileState.Initial;
    private tokenizer: LineTokenizer;
    private savedInToken: Token|undefined;
    private outQueue = new Collections.Queue<Token>();
    private gotK: boolean = false;
    private startedFileHeader: boolean = false;
    private errorCB: FileTokenizerCB;
    

    constructor(inputData: string) {
        this.tokenizer = new LineTokenizer(inputData);
    }
    
    public setErrorCB(cb: FileTokenizerCB) {
        this.errorCB = cb;
    }

    private error(token: Token, message: string): void {
        console.log("At %s:%s, %s", token.lineNumber, token.charNumber, message);

        if (!this.errorCB) {
            return;
        }

        let tok: Token = Object.assign({}, token);
        tok.type = TokenType.Error;
        tok.value = message;

        this.errorCB(tok);
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

        if (token.type === TokenType.Comment) {
            return token;
        }
        if (token.type === TokenType.EOF) {
            if (this.startedFileHeader) {
                this.outQueue.enqueue(Object.assign({}, token));
                token.type = TokenType.FileHeaderEnd;
                token.value = undefined;
            }
            // Otherwise pass through EOF token as normal
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
                        // Pass through AbcDeclaration token as normal
                        break;
                    
                    case TokenType.InformationField:
                    case TokenType.StyleSheetDirective:
                        this.error(token, "Missing ABC declaration");
                        // Re-process this token in the File Header state
                        this.state = FileState.FileHeader;
                        this.savedInToken = token;
                        token = undefined;
                        break;
                    
                    case TokenType.BlankLine:
                        this.error(token, "Missing ABC declaration and no file header");
                        // Move to inter tune state and swallow blank line
                        this.state = FileState.InterTune;
                        token = undefined;
                        break;

                    case TokenType.FreeText:
                        this.error(token, "Unexpected free text at beginning of file");
                        // Move to free text state passing through token
                        this.state = FileState.InterTune;
                        break;
                }
                break;

            case FileState.FileHeader:
                switch(token.type) {
                    case TokenType.InformationField:
                    case TokenType.StyleSheetDirective:
                        if (!this.startedFileHeader) {
                            this.startedFileHeader = true;
                            // Return a file header start and then return the current token
                            this.outQueue.enqueue(Object.assign({}, token));
                            token.type = TokenType.FileHeaderStart;
                            token.value = undefined;
                        }
                        // Otherwise pass token through as normal
                        break;

                    case TokenType.BlankLine:
                        // Move to Inter Tune state
                        this.state = FileState.InterTune;
                        if (this.startedFileHeader) {
                            this.startedFileHeader = false;
                            // Convert blank line into file header end
                            token.type = TokenType.FileHeaderEnd;
                            token.value = undefined;
                        } else {
                            // Swallow the blank line token
                            token = undefined;
                        }
                        break;

                    case TokenType.FreeText:
                        this.error(token, "Free text must be separated from the file header by empty lines");
                        // Return a file header end if needed then re-process this token in the Free Text state
                        this.state = FileState.FreeText;
                        if (this.startedFileHeader) {
                            this.startedFileHeader = false;
                            this.savedInToken = Object.assign({}, token);
                            token.type = TokenType.FileHeaderEnd;
                            token.value = undefined;
                        }
                        // Otherwise pass token through as normal
                        break;
                }
                break;

            case FileState.InterTune:
                switch(token.type) {
                    case TokenType.InformationField:
                        if (!token.value!.startsWith("X:")) {
                            this.error(token, "Got information field to start a tune, but it is not X: '" + token.value + "'");
                            // But carry on
                        }

                        // Return a tune header start and then process the token
                        this.state = FileState.TuneHeader;
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
                        // Pass through token as normal
                        this.state = FileState.FreeText;
                        break;
                }
                break;
        
            case FileState.FreeText:
                switch(token.type) {
                    case TokenType.FreeText:
                        // Pass through token as normal
                        break;

                    case TokenType.BlankLine:
                        // Move to Inter Tune state and swallow the blank line token
                        this.state = FileState.InterTune;
                        token = undefined;                                                
                        break;
                        
                    case TokenType.InformationField:
                    case TokenType.StyleSheetDirective:
                        this.error(token, "Free text must be separated from abc tunes, typeset text and the file header by empty lines");
                        // Re-process this token in the Inter Tune state
                        this.state = FileState.InterTune;
                        this.savedInToken = token;
                        token = undefined;
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