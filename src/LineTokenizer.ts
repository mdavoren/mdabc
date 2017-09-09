import os = require("os");

import {BaseTokenizer} from "./BaseTokenizer";
import {Token, TokenType, TokenSubType} from "./Token";

/*
 * Tokenize a string according to ABC syntax
 * There are multiple standards and tools that don't follow the standards
 * So this tokenizer tries to be useful, but general
 *
 * The goal is to provide a sequence of tokens that are useful for a parser
 * but also allow the original string to be recreated
 *
 * The following tokens may be generated
 * - AbcDeclaration (if it occurs it will be first)
 * - LineComment
 * - BlankLine
 * - InformationField
 * - Directive
 * - Text (which might contain actual abc notation)
 * - EOF (will be last)
 *
 * This code will:
 * - Separate comments
 * - Trim leading and trailing white space
 * - Handle %%beginxxx/%%endxxx
 * - Process  %%ss-pref
 * - Handle line continuation
 * - Handle accents, ligatures, unicode characters and other specials
 */
export class LineTokenizer extends BaseTokenizer {
    private lines: string[];
    private lineNumber: number = 1;  // Count lines starting at 1
    private inTextBlock: boolean = false;
    private ssPref: string = "%";

    public constructor(input: string) {
        super();
        let eol: string = "\n";  // Unix
        if (input.indexOf("\r\n") >= 0) {
            eol = "\r\n"; // Windows
        } else if (input.indexOf("\r") >= 0) {
            eol = "\r"; // Macs
        }
        this.lines = input.split(os.EOL);
    }

    public getToken(): Token {

        const token: Token = {
            type: TokenType.Error,
            subType: undefined,
            originalLine: "",
            value: undefined,
            lineNumber: this.lineNumber,
        };

        if (this.lineNumber > this.lines.length) {
            token.type = TokenType.EOF;
            return token;
        }

        token.originalLine = this.lines[this.lineNumber - 1];

        const line = this.clean(token.originalLine);

        if (this.lineNumber === 1 && this.lines[0].startsWith("%abc")) {
            token.type = TokenType.AbcDeclaration;
            token.value = this.lines[0].startsWith("%abc-") ? this.lines[0].substr(5) : this.lines[0];

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
            token.type = TokenType.Directive;
            token.value = line.substr(2);

        } else if (/^\s*$/.test(line)) {
            token.type = TokenType.BlankLine;

        } else {
            token.type = TokenType.Text;
            token.value = line;
        }

        if (token.value) {
            token.value.replace(os.EOL, "");
        }

        return token;
    }

    private static mnemonics: {[key: string]: string} = {
        "`A": "À",
        "`a": "à",
        "`E": "È",
        "`e": "è",
        "`I": "Ì",
        "`i": "ì",
        "`O": "Ò",
        "`o": "ò",
        "`U": "Ù",
        "`u": "ù",
        "'A": "Á",
        "'a": "á",
        "'E": "É",
        "'e": "é",
        "'I": "Í",
        "'i": "í",
        "'O": "Ó",
        "'o": "ó",
        "'U": "Ú",
        "'u": "ú",
        "'Y": "Ý",
        "'y": "ý",
        "^A": "Â",
        "^a": "â",
        "^E": "Ê",
        "^e": "ê",
        "^I": "Î",
        "^i": "î",
        "^O": "Ô",
        "^o": "ô",
        "^U": "Û",
        "^u": "û",
        "^Y": "Ŷ",
        "^y": "ŷ",
        "~A": "Ã",
        "~a": "ã",
        "~N": "Ñ",
        "~n": "ñ",
        "~O": "Õ",
        "~o": "õ",
        "\"A": "Ä",
        "\"a": "ä",
        "\"E": "Ë",
        "\"e": "ë",
        "\"I": "Ï",
        "\"i": "ï",
        "\"O": "Ö",
        "\"o": "ö",
        "\"U": "Ü",
        "\"u": "ü",
        "\"Y": "Ÿ",
        "\"y": "ÿ",
        "cC": "Ç",
        "cc": "ç",
        "AA": "Å",
        "aa": "å",
        "/O": "Ø",
        "/o": "ø",
        "uA": "Ă",
        "ua": "ă",
        "uE": "Ĕ",
        "ue": "ĕ",
        "vS": "Š",
        "vs": "š",
        "vZ": "Ž",
        "vz": "ž",
        "HO": "Ő",
        "Ho": "ő",
        "HU": "Ű",
        "Hu": "ű",
        "AE": "Æ",
        "ae": "æ",
        "OE": "Œ",
        "oe": "œ",
        "ss": "ß",
        "DH": "Ð",
        "dh": "ð",
        "TH": "Þ",
        "th": "þ"
    };

    private static htmlEntities: {[key: string]: string} = {
        "Agrave": "À",
        "agrave": "à",
        "Egrave": "È",
        "egrave": "è",
        "Igrave": "Ì",
        "igrave": "ì",
        "Ograve": "Ò",
        "ograve": "ò",
        "Ugrave": "Ù",
        "ugrave": "ù",
        "Aacute": "Á",
        "aacute": "á",
        "Eacute": "É",
        "eacute": "é",
        "Iacute": "Í",
        "iacute": "í",
        "Oacute": "Ó",
        "oacute": "ó",
        "Uacute": "Ú",
        "uacute": "ú",
        "Yacute": "Ý",
        "yacute": "ý",
        "Acirc": "Â",
        "acirc": "â",
        "Ecirc": "Ê",
        "ecirc": "ê",
        "Icirc": "Î",
        "icirc": "î",
        "Ocirc": "Ô",
        "ocirc": "ô",
        "Ucirc": "Û",
        "ucirc": "û",
        "Ycirc": "Ŷ",
        "ycirc": "ŷ",
        "Atilde": "Ã",
        "atilde": "ã",
        "Ntilde": "Ñ",
        "ntilde": "ñ",
        "Otilde": "Õ",
        "otilde": "õ",
        "Auml": "Ä",
        "auml": "ä",
        "Euml": "Ë",
        "euml": "ë",
        "Iuml": "Ï",
        "iuml": "ï",
        "Ouml": "Ö",
        "ouml": "ö",
        "Uuml": "Ü",
        "uuml": "ü",
        "Yuml": "Ÿ",
        "yuml": "ÿ",
        "Ccedil": "Ç",
        "ccedil": "ç",
        "Aring": "Å",
        "aring": "å",
        "Oslash": "Ø",
        "oslash": "ø",
        "Abreve": "Ă",
        "abreve": "ă",
        "Scaron": "Š",
        "scaron": "š",
        "Zcaron": "Ž",
        "zcaron": "ž",
    };

    /*
     * Clean up input line
     * - Remove comments
     * - Trim leading and trailing white space
     * - Handle accents, ligatures, unicode characters and other specials
     */
    protected clean(input: string): string {
        let output = "";

        // Handle pseudo comments
        // - They must start at the beginning of the line
        // - They must not be stripped out as normal comments
        // - By default they start with %%, but that can be changed with %%ss-pref
        // - It is ok to strip white space between %% and directive (abcm2ps)
        if (input.length >= 2
         && input[0] === "%"
         && this.ssPref.includes(input[1])) {
             output = input.substr(0, 2);
             input = input.substr(2);
        }

        input = input.trim();

        const length = input.length;
        for (let inp = 0; inp < length; ) {
            let outchar: string|undefined;

            // Trim comments (pseudo comments have already been handled)
            if (input[inp] === "%") {
                // Trim any trailing spaces before comment and stop processing input
                output = output.trim();
                break;
            }

            // Handle escape sequences
            switch (input[inp]) {
                case "\\":
                    inp++;

                    // Handle \ at end of line
                    if (inp === length) {
                        output += "\\";
                        break;
                    }

                    // Handle special and unicode characters
                    switch (input[inp]) {
                        case "\\":  outchar = "\\"; inp++; break;
                        case "%":   outchar = "%"; inp++; break;
                        case "&":   outchar = "&"; inp++; break;
                        case "u":
                            if (/[0-9a-fA-F]{4}/.test(input.substr(inp + 1, 4))) {
                                outchar = String.fromCodePoint(parseInt(input.substr(inp + 1, 4), 16));
                                inp += 5;
                            }
                            break;
                        case "U":
                            if (/[0-9a-fA-F]{8}/.test(input.substr(inp + 1, 8))) {
                                outchar = String.fromCodePoint(parseInt(input.substr(inp + 1, 8), 16));
                                inp += 9;
                            }
                            break;
                    }

                    // Handle mnemonics
                    // All mnemonics are 2 characters
                    if (outchar === undefined) {
                        outchar = LineTokenizer.mnemonics[input.substr(inp, 2)];
                        if (outchar !== undefined) {
                            inp += 2;
                        }
                    }

                    if (outchar === undefined) {
                        // Unrecognized '\' escape sequence
                        // TODO: Could throw a warning here
                        // Just pass the '\' through
                        outchar = "\\";
                    }

                    output += outchar;
                    break;

                // Handle html entity
                case "&":
                    inp++;
                    outchar = undefined;
                    const entity = /^([a-zA-Z]+);/.exec(input.substr(inp));
                    if (entity) {
                        outchar = LineTokenizer.htmlEntities[entity[1]];
                        if (outchar) {
                            inp += entity[1].length + 1; // +1 for ';'
                        }
                    }
                    if (outchar === undefined) {
                        // Unrecognized html entity
                        // TODO: Could throw a warning here
                        // Just pass the '&' through
                        outchar = "&";
                    }
                    output += outchar;
                    break;

                default:
                    output += input[inp++];
            }
        }
        return output;
    }
}
