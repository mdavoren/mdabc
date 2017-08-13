import * as tok from './LineTokenizer';
let fs = require("fs")

//var argv = require('minimist')(process.argv.slice(2));
//argv._[0]

    let inputData: string = fs.readFileSync("./test/data/file/abcDeclaration.abc", "utf8");
    console.log("Input = '" + inputData + "'");

    let tokenizer = new tok.LineTokenizer(inputData);
    let token: tok.LineToken;
    while (token = tokenizer.getToken(true), token.type !== tok.LineType.EOF) {
        console.log(tok.LineType[token.type] + ": " + token.value + "\n");
    }
    console.log("Complete");
