import {TokenType, Token} from "./Token";

export declare type FileTokenizerCB = (tok: Token) => void;

export class BaseTokenizer {
    private errorCB: FileTokenizerCB;

    public setErrorCB(cb: FileTokenizerCB) {
        this.errorCB = cb;
    }

    protected error(token: Token, message: string): void {
        console.log("At %s:%s, %s", token.lineNumber, token.charNumber, message);

        if (!this.errorCB) {
            return;
        }

        const tok: Token = Object.assign({}, token);
        tok.type = TokenType.Error;
        tok.subType = undefined;
        tok.value = message;

        this.errorCB(tok);
    }
}
