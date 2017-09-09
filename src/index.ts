import fs = require("fs");

import {LineTokenizer} from "./LineTokenizer";
import {TokenType, Token} from "./Token";

// var argv = require("minimist")(process.argv.slice(2));
// argv._[0]

const inputData: string = fs.readFileSync("./test/data/file/abcDeclaration.abc", "utf8");
console.log("Input = '" + inputData + "'");

const tokenizer = new LineTokenizer(inputData);
let token: Token;
while (token = tokenizer.getToken(), token.type !== TokenType.EOF) {
    console.log(TokenType[token.type] + ": " + token.value + "\n");
}
console.log("Complete");
