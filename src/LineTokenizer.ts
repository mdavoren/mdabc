import os = require("os");

import {BaseTokenizer} from "./BaseTokenizer";
import {Token, TokenType, TokenSubType} from "./Token";

/*
 * First of several tokenizers, LineTokenizer deals with comments
 * and classifies the input as various line types
 */
export class LineTokenizer extends BaseTokenizer {
    private lines: string[];
    private lineNumber: number = 1;
    private charNumber: number = 1;
    private savedComment: string|undefined = undefined;
    private inTextBlock: boolean = false;

    constructor(input: string) {
        super();
        this.lines = input.split(os.EOL);
    }

    public getToken(inTune: boolean): Token {
        const token: Token = {
            type: TokenType.Error,
            subType: undefined,
            value: undefined,
            lineNumber: this.lineNumber,
            charNumber: this.charNumber
        };

        if (this.savedComment) {
            token.type = TokenType.Comment;
            token.value = this.savedComment;
            this.lineNumber++;
            this.charNumber = 1;
            this.savedComment = undefined;
            return token;
        }

        if (this.lineNumber > this.lines.length) {
            token.type = TokenType.EOF;
            return token;
        }

        const line = this.lines[this.lineNumber - 1];

        if (this.lineNumber === 1 && line.startsWith("%abc")) {
            token.type = TokenType.AbcDeclaration;
            token.value = line.startsWith("%abc-") ? line.substr(5) : line;

        } else if (this.inTextBlock) {
            token.type = TokenType.Text;
            if (line.startsWith("%%")) {
                if (line.startsWith("%%endtext")) {
                    if (line.substr(9).trim().length > 1) {
                        this.error(token, "Text after %%endtext will be ignored");
                    }
                    token.subType = TokenSubType.EndText;
                    token.value = line.substr("%%endtext".length);  // So we can reproduce original file, errors and all
                    this.inTextBlock = false;
                } else {
                    token.subType = TokenSubType.Text;
                    token.value = line.substr(2);
                }
            } else {
                this.error(token, "Line between begintext and %%endtext does not begin with %%");
                token.subType = TokenSubType.Text;
                token.value = line;
            }

        } else if (/[A-Za-z]:/.test(line)) {
            token.type = TokenType.InformationField;
            token.value = line;

        } else if (line.startsWith("%%text")) {               // TODO: Should %%textabc match with value abc
            token.type = TokenType.Text;
            token.subType = TokenSubType.Text;
            token.value = line.substr("%%text".length);       // TODO: Should this be trimmed?

        } else if (line.startsWith("%%center")) {             // TODO: Should %%centerabc match with value abc
            token.type = TokenType.Text;
            token.subType = TokenSubType.Center;
            token.value = line.substr("%%center".length);     // TODO: Should this be trimmed?

        } else if (line.startsWith("%%begintext")) {          // TODO: Should we match %%begintextabc
            token.type = TokenType.Text;
            token.subType = TokenSubType.BeginText;
            if (line.substr("%%begintext".length).trim().length > 0) {
                this.error(token, "Text after %%begintext will be ignored");
            }
            token.value = line.substr("%%begintext".length);  // So we can reproduce original file, errors and all
            this.inTextBlock = true;

        // endtext is handled in the inTextBlock check earlier

        } else if (line.startsWith("%%")) {
            token.type = TokenType.StyleSheet;
            token.value = line.substr(2);

        } else if (/^\s*%/.test(line)) {
            token.type = TokenType.Comment;
            token.value = line.substr(line.indexOf("%") + 1);

        } else if (/^\s*$/.test(line)) {
            token.type = TokenType.BlankLine;

        } else {
            token.type = inTune ? TokenType.MusicCode : TokenType.FreeText;
            token.value = line;
        }

        if (token.value) {
            token.value.replace(os.EOL, "");
        }

        // Assume that only music code and information field lines can have comments
        const pcidx = line.indexOf("%");
        if ((token.type === TokenType.MusicCode || token.type === TokenType.InformationField)
         && pcidx !== -1 && line.charAt(pcidx - 1) !== "\\") {
            this.savedComment = line.substr(pcidx + 1);
            this.charNumber = pcidx + 1;
            token.value = line.substring(0, pcidx);
        } else {
            this.lineNumber++;
            this.charNumber = 1;
        }

        return token;
    }
}
