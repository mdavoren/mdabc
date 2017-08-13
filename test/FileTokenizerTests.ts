import {TokenType, Token} from '../src/Token';
import {FileTokenizer} from '../src/FileTokenizer';

import { expect } from 'chai';
let fs = require("fs")
let os = require('os')

function test(inputFile: string, expectedFile: string) : void {
    let inputData: string = fs.readFileSync("./test/data/file/" + inputFile, "utf8");
    let expectedResult: string = fs.readFileSync("./test/data/file/" + expectedFile, "utf8");
    let tokenizer = new FileTokenizer(inputData);
    let token: Token;
    let actualResult: string = "";
    let first: boolean = true;
    while (token = tokenizer.getToken(), token.type !== TokenType.EOF) {
        if (first) {
            first = false;
        } else {
            actualResult += os.EOL;           
        }
        actualResult += TokenType[token.type] + ":";
        actualResult += token.value ? " " + token.value : ""
    }
    expect(actualResult).to.equal(expectedResult);
}

describe('FileTokenizer', function() {
    it('should be happy', function() {
        test("happy.abc", "happy.exp");
    })
})