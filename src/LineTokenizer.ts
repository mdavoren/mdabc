let os = require('os')

import {Token, TokenType} from './Token';

export class LineTokenizer {
    private lines: string[];
    private lineNumber: number = 1;
    private charNumber: number = 1;
    private comment: string|undefined = undefined;

    constructor(input: string) {
        this.lines = input.split(os.EOL)
    }

    getToken(inTune: boolean): Token {
        let token: Token = {
            type: TokenType.Error,
            value: undefined,
            lineNumber: this.lineNumber,
            charNumber: this.charNumber
        }

        if (this.comment) {
            token.type = TokenType.Comment;
            token.value = this.comment;
            this.lineNumber++;
            this.charNumber = 1;
            this.comment = undefined;
            return token;
        }

        if (this.lineNumber > this.lines.length) {
            token.type = TokenType.EOF;
            return token;
        }

        let line = this.lines[this.lineNumber - 1];

        if (this.lineNumber === 1 && line.startsWith("%abc")) {
            token.type = TokenType.AbcDeclaration;
            token.value = line.startsWith("%abc-") ? line.substr(5) : line;
        } else if (/[A-Za-z]:/.test(line)) {
            token.type = TokenType.InformationField;
            token.value = line;
        } else if (line.startsWith("%%")) {
            token.type = TokenType.StyleSheetDirective;
            token.value = line.substr(2);
        } else if (/^\s*%/.test(line)) {
            token.type = TokenType.Comment
            token.value = line.substr(line.indexOf("%") + 1)
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
        let pcidx = line.indexOf("%");
        if ((token.type === TokenType.MusicCode || token.type === TokenType.InformationField)
         && pcidx !== -1 && line.charAt(pcidx-1) !== '\\') {
            this.comment = line.substr(pcidx+1);
            this.charNumber = pcidx+1;
            token.value = line.substring(0, pcidx);
        } else {
            this.lineNumber++;
            this.charNumber = 1;
        }

        return token;
    }
}
