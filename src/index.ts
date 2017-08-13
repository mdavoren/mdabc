let fs = require("fs")

import {LineTokenizer} from './LineTokenizer';
import {TokenType, Token} from './Token';


//var argv = require('minimist')(process.argv.slice(2));
//argv._[0]

    let inputData: string = fs.readFileSync("./test/data/file/abcDeclaration.abc", "utf8");
    console.log("Input = '" + inputData + "'");

    let tokenizer = new LineTokenizer(inputData);
    let token: Token;
    while (token = tokenizer.getToken(true), token.type !== TokenType.EOF) {
        console.log(TokenType[token.type] + ": " + token.value + "\n");
    }
    console.log("Complete");
