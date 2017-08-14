import {TokenType, Token} from '../src/Token';
import {FileTokenizer} from '../src/FileTokenizer';

import { expect } from 'chai';
let fs = require("fs")
let os = require('os')

function test(fileName: string) : void {
    const dataDir: string = "./test/data/file/";
    let inputData: string = fs.readFileSync(dataDir + fileName + ".abc", "utf8");
    let expectedResult: string = fs.readFileSync(dataDir + fileName + ".exp", "utf8");
    let tokenizer = new FileTokenizer(inputData);
    let token: Token;
    let actualResult: string = "";
    let first: boolean = true;

    function processToken(tok: Token): void {
        if (first) {
            first = false;
        } else {
            actualResult += os.EOL;           
        }
        actualResult += TokenType[tok.type] + ":";
        actualResult += tok.value ? " " + tok.value : "";
    }

    tokenizer.setErrorCB(processToken);

    while (token = tokenizer.getToken(), token.type !== TokenType.EOF) {
        processToken(token);
    }

    expect(actualResult).to.equal(expectedResult);
}

describe('FileTokenizer', function() {
    it('should be happy', function() {
        test("happy");
    })
    
    it('should handle an ABC declaration', function() {
        test("A");
    })
    
    it('should handle an ABC declaration, file header', function() {
        test("AH");
    })
    
    it('should handle an ABC declaration, free text', function() {
        test("AF");
    })
    
    it('should handle an ABC declaration, blank line', function() {
        test("AB");
    })
    
    it('should handle an ABC declaration, blank line, free text', function() {
        test("ABF");
    })
    
    it('should handle an ABC declaration, file header, free text', function() {
        test("AHF");
    })

    it('should handle an ABC declaration, file header, blank line, free text', function() {
        test("AHBF");
    })

    it('should handle a blank line, free text', function() {
        test("BF");
    })

    it('should handle free text', function() {
        test("F");
    })

    it('should handle file header', function() {
        test("H");
    })
})